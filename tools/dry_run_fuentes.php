<?php
declare(strict_types=1);

/**
 * Dry-run de fuentes registradas (config/sources.php) — Pulso Cívico.
 *
 * Prueba la accesibilidad real de las fuentes sin escribir ningún dato
 * canónico ni de contraste: solo descarga evidencia cruda a
 * storage/raw/html/ (gitignored) con su SHA-256 y reporta HTTP real,
 * tamaño y registros detectados.
 *
 * Uso:
 *   php tools/dry_run_fuentes.php
 *   php tools/dry_run_fuentes.php --fuentes=pdn-s3,gaceta,dof,expansion
 *   php tools/dry_run_fuentes.php --fuentes=pdn-s3 --solo-proveedores
 *
 * Respeta la pausa mínima de 1,250 ms entre peticiones (HttpClient) y nunca
 * abre rutas vetadas (SIL pp_PerfilLegislador.php, SLP Disallow:/).
 * Requiere PHP 8.1+ con cURL. Sin PHP en la máquina, la prueba equivalente
 * se hace con curl y la misma pausa (ver docs/FUENTES_SCRAPEO.md).
 */

$rootDir = dirname(__DIR__);

spl_autoload_register(function (string $class) use ($rootDir): void {
    $prefix = 'PulsoCivico\\';
    $baseDir = $rootDir . '/src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

use PulsoCivico\Core\EvidenceHasher;
use PulsoCivico\Core\HttpClient;
use PulsoCivico\Core\Logger;

$config = require $rootDir . '/config/config.php';
$fuentes = require $rootDir . '/config/sources.php';

$opciones = [];
foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--fuentes=')) {
        $opciones['fuentes'] = explode(',', substr($arg, strlen('--fuentes=')));
    }
}
$idsPedidos = $opciones['fuentes'] ?? ['pdn-s3', 'gaceta', 'dof', 'expansion'];

$porId = [];
foreach ($fuentes as $fuente) {
    $porId[$fuente['id']] = $fuente;
}

$rawDir = $config['paths']['raw_html'];
if (!is_dir($rawDir)) {
    mkdir($rawDir, 0777, true);
}

$logger = new Logger($config['paths']['logs'], 'DRY-RUN-FUENTES');
$httpConfig = $config['pdn'] ?? [];
$httpConfig['rate_limit_ms'] = max(1000, (int)($httpConfig['rate_limit_ms'] ?? 1250));
$http = new HttpClient($httpConfig, $logger);
$fechaHoy = (new \DateTimeImmutable())->format('Y-m-d');

$resultados = [];
foreach ($idsPedidos as $id) {
    $id = trim($id);
    if (!isset($porId[$id])) {
        $resultados[] = ['id' => $id, 'ok' => false, 'error' => 'fuente no registrada en config/sources.php'];
        continue;
    }
    $fuente = $porId[$id];
    if (($fuente['estado'] ?? '') === 'bloqueada') {
        $resultados[] = [
            'id' => $id,
            'nivel' => $fuente['nivel'],
            'flujo' => $fuente['flujo'],
            'ok' => false,
            'error' => 'bloqueada: no se intenta la petición (' . ($fuente['notas'] ?? '') . ')',
        ];
        continue;
    }

    $url = $fuente['url'];
    if ($url === '') {
        $resultados[] = ['id' => $id, 'ok' => false, 'error' => 'sin URL directa (ver servicios por entidad)'];
        continue;
    }

    try {
        $headers = str_contains($url, 'api.plataformadigitalnacional.org')
            ? ['Accept: application/json']
            : [];
        $response = $http->request('GET', $url, [], $headers);
        $cuerpo = (string)$response['body'];
        $extension = str_contains($url, 'api.plataformadigitalnacional.org') ? 'json' : 'html';
        $archivo = "{$rawDir}/dry_run_{$id}_{$fechaHoy}.{$extension}";
        file_put_contents($archivo, $cuerpo);
        $registros = null;
        if ($extension === 'json') {
            $decodificado = json_decode($cuerpo, true);
            if (is_array($decodificado) && isset($decodificado['data']) && is_array($decodificado['data'])) {
                $registros = count($decodificado['data']);
            }
        }
        $resultados[] = [
            'id' => $id,
            'nivel' => $fuente['nivel'],
            'flujo' => $fuente['flujo'],
            'ok' => true,
            'http' => $response['status'],
            'bytes' => $response['bytes'],
            'registros_detectados' => $registros,
            'sha256' => EvidenceHasher::hashContent($cuerpo),
            'evidencia' => $archivo,
            'url' => $url,
        ];
    } catch (\Throwable $e) {
        $resultados[] = [
            'id' => $id,
            'nivel' => $fuente['nivel'],
            'flujo' => $fuente['flujo'],
            'ok' => false,
            'error' => $e->getMessage(),
            'url' => $url,
        ];
    }
}

echo json_encode([
    'fecha' => $fechaHoy,
    'fuentes_probadas' => count($resultados),
    'ok' => count(array_filter($resultados, static fn(array $r): bool => $r['ok'] ?? false)),
    'resultados' => $resultados,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
