<?php
declare(strict_types=1);

namespace PulsoCivico\Services;

use PulsoCivico\Core\EvidenceHasher;
use PulsoCivico\Core\HttpClient;
use PulsoCivico\Core\Logger;
use PulsoCivico\DTO\SancionDTO;

/**
 * Scraper de la Plataforma Digital Nacional (SNA) — Sistema 3.
 *
 * FUENTE FUNDAMENTAL ANTICORRUPCIÓN de la suite: el Sistema nacional de
 * Servidores públicos y particulares sancionados, consultado a través de la
 * API pública JSON de la PDN (sin autenticación). Cada registro es una
 * sanción firme e inhabilitación pública: nombre, cargo, ente público,
 * entidad, falta cometida y resolución con fechas y autoridad.
 *
 * Salida SIEMPRE al dataset de contraste (storage/data/contraste/): las
 * sanciones verifican y enriquecen a personas que ya existen en Tlatoa, no
 * crean rosters canónicos. Nunca se escribe en storage/data/json/.
 *
 * PRIVACIDAD: solo campos públicos del cargo. El DTO descarta por diseño
 * RFC, CURP, domicilios, teléfonos, correos personales y montos
 * patrimoniales. El Sistema 1 de la PDN (declaraciones patrimoniales) NO
 * se consulta en este servicio.
 */
class AnticorrupcionScraperService
{
    private const API_BASE = 'https://api.plataformadigitalnacional.org/s3-wrapper';
    private const PORTAL_URL = 'https://www.plataformadigitalnacional.org/servidores';

    /** Colecciones públicas del Sistema 3 (faltas graves y no graves). */
    public const COLECCIONES = [
        'faltas_administrativas_graves',
        'faltas_administrativas_no_graves',
        'faltas_graves_personas_fisicas',
        'faltas_graves_personas_morales',
    ];

    private array $config;
    private HttpClient $http;
    private Logger $logger;

    public function __construct(array $config, HttpClient $http, Logger $logger)
    {
        $this->config = $config;
        $this->http = $http;
        $this->logger = $logger;
    }

    /**
     * Lista los proveedores (SESEA estatales) que alimentan el Sistema 3.
     *
     * @return array<int, array{id: string, name: string}>
     */
    public function listProviders(): array
    {
        $url = self::API_BASE . '/api/v1/providers';
        $response = $this->http->request('GET', $url);
        $data = json_decode((string)$response['body'], true);
        if (!is_array($data) || ($data['success'] ?? false) !== true || !is_array($data['data'] ?? null)) {
            throw new \RuntimeException("Respuesta inesperada de la API PDN Sistema 3: {$url}");
        }
        return array_values(array_filter(array_map(
            static fn(array $p): ?array => isset($p['id'], $p['name'])
                ? ['id' => (string)$p['id'], 'name' => (string)$p['name']]
                : null,
            $data['data']
        )));
    }

    /**
     * Descarga una página de una colección para un proveedor.
     *
     * @return array{items: array, pagination: array}
     */
    public function fetchColeccion(string $coleccion, string $proveedorId, int $pagina = 1, int $limite = 50): array
    {
        if (!in_array($coleccion, self::COLECCIONES, true)) {
            throw new \InvalidArgumentException("Colección del Sistema 3 no reconocida: {$coleccion}");
        }
        $url = self::API_BASE . "/api/v1/{$coleccion}/{$proveedorId}?page={$pagina}&limit={$limite}";
        $response = $this->http->request('GET', $url);
        $data = json_decode((string)$response['body'], true);
        if (!is_array($data) || ($data['success'] ?? false) !== true || !is_array($data['data'] ?? null)) {
            throw new \RuntimeException("Respuesta inesperada de la API PDN Sistema 3: {$url}");
        }
        return [
            'items' => $data['data'],
            'pagination' => is_array($data['pagination'] ?? null) ? $data['pagination'] : [],
        ];
    }

    /**
     * Barre el Sistema 3 y escribe el resultado al dataset de contraste.
     *
     * Parámetros:
     *   - proveedor: id de un proveedor concreto (null = todos).
     *   - colecciones: lista de colecciones (por defecto solo faltas graves).
     *   - max_paginas: tope de páginas por colección y proveedor (por defecto 10).
     *   - limite: registros por página (por defecto 50).
     *   - dry_run: true = solo primera página del primer proveedor, sin escribir JSON.
     *
     * La evidencia cruda (JSON de la API) se guarda en storage/raw/html/ con su
     * SHA-256. El dataset de contraste resultante va a
     * storage/data/contraste/sanciones_pdn_YYYY-MM-DD.json. NUNCA se toca
     * storage/data/json/ ni la base canónica.
     */
    public function scrapeSanciones(array $params = []): array
    {
        $soloProveedor = isset($params['proveedor']) ? (string)$params['proveedor'] : null;
        $colecciones = $params['colecciones'] ?? ['faltas_administrativas_graves'];
        if (is_string($colecciones)) {
            $colecciones = [$colecciones];
        }
        $maxPaginas = isset($params['max_paginas']) ? (int)$params['max_paginas'] : 10;
        $limite = isset($params['limite']) ? (int)$params['limite'] : 50;
        $dryRun = !empty($params['dry_run']);
        $fechaHoy = (new \DateTimeImmutable())->format('Y-m-d');

        $this->logger->info('Iniciando extracción PDN Sistema 3 (anticorrupción)', [
            'proveedor' => $soloProveedor ?? 'todos',
            'colecciones' => $colecciones,
            'dry_run' => $dryRun,
        ]);

        $proveedores = $this->listProviders();
        if ($soloProveedor !== null) {
            $proveedores = array_values(array_filter(
                $proveedores,
                static fn(array $p): bool => $p['id'] === $soloProveedor
            ));
            if (empty($proveedores)) {
                throw new \InvalidArgumentException("Proveedor del Sistema 3 no encontrado: {$soloProveedor}");
            }
        }

        $rawDir = $this->config['paths']['raw_html'];
        if (!is_dir($rawDir)) {
            mkdir($rawDir, 0777, true);
        }

        $sanciones = [];
        $consultados = [];
        $resumen = [
            'ok' => true,
            'fuente' => 'pdn-s3',
            'nivel' => 'A',
            'flujo' => 'contraste',
            'fecha_extraccion' => $fechaHoy,
            'proveedores_consultados' => 0,
            'total_registros' => 0,
            'errores' => [],
        ];

        foreach ($proveedores as $proveedor) {
            $proveedorId = $proveedor['id'];
            foreach ($colecciones as $coleccion) {
                $pagina = 1;
                while ($pagina <= $maxPaginas) {
                    try {
                        $resultado = $this->fetchColeccion($coleccion, $proveedorId, $pagina, $limite);
                    } catch (\Throwable $e) {
                        $msg = "Proveedor {$proveedorId} / {$coleccion} pág. {$pagina}: " . $e->getMessage();
                        $this->logger->warning($msg);
                        $resumen['errores'][] = $msg;
                        break;
                    }

                    $items = $resultado['items'];
                    $paginacion = $resultado['pagination'];
                    $consultados[$proveedorId] = true;

                    // Evidencia cruda con SHA-256 (fe pública digital).
                    $crudo = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $archivoCrudo = "{$rawDir}/pdn_s3_{$proveedorId}_{$coleccion}_p{$pagina}.json";
                    file_put_contents($archivoCrudo, $crudo);
                    $sha = EvidenceHasher::hashContent((string)$crudo);

                    foreach ($items as $item) {
                        if (!is_array($item) || empty($item['id'])) {
                            continue;
                        }
                        $dto = SancionDTO::fromPdnS3($item, $proveedorId, self::PORTAL_URL);
                        $arr = $dto->toArray();
                        $arr['sha256'] = $sha;
                        $sanciones[] = $arr;
                    }

                    $this->logger->info("PDN S3 {$proveedorId} / {$coleccion} pág. {$pagina}", [
                        'registros' => count($items),
                        'sha256' => $sha,
                    ]);

                    if ($dryRun || empty($paginacion['hasNextPage'])) {
                        break;
                    }
                    $pagina++;
                }
                if ($dryRun) {
                    break 2;
                }
            }
        }

        $resumen['total_registros'] = count($sanciones);
        $resumen['proveedores_consultados'] = count($consultados);

        if ($dryRun) {
            $resumen['archivo'] = null;
            $resumen['nota'] = 'dry-run: sin escritura del dataset de contraste';
            return $resumen;
        }

        $dirContraste = dirname((string)$this->config['paths']['data_json']) . '/contraste';
        if (!is_dir($dirContraste)) {
            mkdir($dirContraste, 0777, true);
        }
        $archivo = "{$dirContraste}/sanciones_pdn_{$fechaHoy}.json";
        $dataset = [
            'metadata' => [
                'titulo' => 'Sanciones firmes a servidores públicos — PDN Sistema 3 (SNA)',
                'fuente' => 'Plataforma Digital Nacional, Sistema 3',
                'fuente_url' => self::API_BASE . '/api/v1/providers',
                'fecha_extraccion' => $fechaHoy,
                'nivel' => 'A',
                'flujo' => 'contraste',
                'etiqueta_frescura' => '[Fuente Actualizada No Oficial]',
                'nota_privacidad' => 'Solo campos públicos del cargo. Sin RFC, CURP, domicilios, teléfonos ni montos patrimoniales.',
                'total_registros' => count($sanciones),
            ],
            'registros' => $sanciones,
        ];
        file_put_contents($archivo, json_encode($dataset, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $resumen['archivo'] = $archivo;

        $this->logger->success('Extracción PDN Sistema 3 concluida', [
            'total_registros' => count($sanciones),
            'archivo' => $archivo,
        ]);

        return $resumen;
    }
}
