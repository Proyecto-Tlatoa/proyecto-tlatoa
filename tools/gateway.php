<?php
declare(strict_types=1);

/**
 * Gateway CLI de Scrapers — Pulso Cívico
 * Punto de entrada unificado para invocar extractores y validadores de datos gubernamentales.
 */

require_once __DIR__ . '/core/Linter.php';
require_once __DIR__ . '/core/ScraperRouter.php';

use PulsoCivico\Tools\Linter;
use PulsoCivico\Tools\ScraperRouter;

$rootDir = dirname(__DIR__);
$action  = $argv[1] ?? 'help';
$target  = $argv[2] ?? '';
$extra   = $argv[3] ?? '';

$response = [
    'action'    => $action,
    'timestamp' => date('Y-m-d H:i:s'),
];

switch ($action) {
    case 'lint':
        if ($target === '') {
            $response['ok'] = false;
            $response['error'] = 'Debe especificar uno o más archivos PHP separados por coma. Ej: php tools/gateway.php lint "src/Services/SilIngestService.php"';
            break;
        }
        $files = array_map(
            static fn(string $f): string => str_starts_with(trim($f), '/') ? trim($f) : $rootDir . '/' . ltrim(trim($f), '/'),
            explode(',', $target)
        );
        $lintResult = Linter::checkFiles($files);
        $response = array_merge($response, $lintResult);
        break;

    case 'lint:dir':
        $dir = $target !== '' ? $rootDir . '/' . ltrim($target, '/') : $rootDir . '/src';
        $lintResult = Linter::checkDirectory($dir);
        $response = array_merge($response, $lintResult);
        break;

    case 'scrape':
        if ($target === '') {
            $response['ok'] = false;
            $response['error'] = 'Debe indicar la fuente o entidad a extraer (ej: sil, cdmx, jalisco). Usa "php tools/gateway.php list" para ver opciones.';
            break;
        }
        $params = [];
        if (!empty($extra)) {
            $decoded = json_decode($extra, true);
            if (is_array($decoded)) {
                $params = $decoded;
            } else {
                $pairs = explode(',', $extra);
                foreach ($pairs as $pair) {
                    if (str_contains($pair, '=')) {
                        [$k, $v] = explode('=', $pair, 2);
                        $params[trim($k)] = trim($v);
                    }
                }
            }
        }
        $res = ScraperRouter::run($rootDir, $target, $params);
        $response = array_merge($response, $res);
        break;

    case 'list':
        $response['ok'] = true;
        $response['scrapers_disponibles'] = [
            'Federal' => [
                'sil'         => 'Sistema de Información Legislativa (Diputados y Senadores)',
                'votaciones'  => 'Votaciones nominales del pleno (SITL)',
                'asistencias' => 'Asistencias por sesión de diputados federales',
            ],
            'Anticorrupción (fundamental)' => [
                'anticorrupcion (pdn-s3)' => 'PDN Sistema 3: servidores públicos y particulares sancionados (API pública; salida a contraste)',
            ],
            'Congresos Estatales' => [
                'aguascalientes (ags)', 'bajacalifornia (bc)', 'bajacaliforniasur (bcs)', 'campeche (cam)',
                'chiapas (chis)', 'chihuahua', 'coahuila', 'colima', 'cdmx', 'durango', 'edomex',
                'guanajuato', 'guerrero', 'hidalgo', 'jalisco (jal)', 'michoacan', 'morelos', 'nayarit',
                'nuevoleon', 'oaxaca', 'puebla', 'queretaro', 'quintanaroo (qroo)', 'sanluispotosi (slp)',
                'sinaloa', 'sonora', 'tabasco', 'tamaulipas', 'tlaxcala', 'veracruz', 'yucatan (yuc)', 'zacatecas'
            ],
            'Parsers Auxiliares (Python)' => [
                'tools/core/coahuila_parser.py' => 'Parser en Python para actas e historial de Coahuila',
                'tools/core/nl_pdf_parser.py'   => 'Extractor en Python para gacetas en PDF de Nuevo León'
            ]
        ];
        break;

    case 'help':
    default:
        $response['mensaje'] = 'CLI Gateway de Scrapers — Pulso Cívico';
        $response['comandos'] = [
            'scrape <fuente> [params]' => 'Ejecuta extracción oficial (ej: php tools/gateway.php scrape cdmx)',
            'list'                     => 'Lista todos los scrapers disponibles por entidad y nivel',
            'lint <archivos>'          => 'Valida sintaxis PHP de uno o varios archivos separados por coma',
            'lint:dir [directorio]'    => 'Valida recursivamente la sintaxis PHP de un directorio (por defecto: src)',
            'help'                     => 'Muestra esta ayuda',
        ];
        break;
}

$json = json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
echo ($json !== false ? $json : json_encode(['error' => 'json_encode_error'])) . PHP_EOL;
