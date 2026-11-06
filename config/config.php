<?php
declare(strict_types=1);

/**
 * Carga nativa de variables desde .env (sin dependencias).
 * Solo define variables que no existan ya en el entorno del sistema.
 */
(static function (string $envFile): void {
    if (!is_file($envFile) || !is_readable($envFile)) {
        return;
    }
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
})(dirname(__DIR__) . '/.env');

$env = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    return $value === false ? $default : $value;
};
$envBool = static function (string $key, bool $default) use ($env): bool {
    $value = strtolower($env($key, $default ? 'true' : 'false'));
    return in_array($value, ['1', 'true', 'yes', 'on'], true);
};

// Configuración general del proyecto Pulso Cívico
return [
    'app' => [
        'name' => 'El Pulso de la Política - ETL Engine',
        'version' => '1.0.0',
        'env' => $env('APP_ENV', 'development'),
    ],
    'sil' => [
        'base_url' => 'http://sil.gobernacion.gob.mx',
        'report_url' => 'http://sil.gobernacion.gob.mx/Reportes/Integracion/HCongreso/ResultIntegHCongreso.php',
        'profile_url' => 'http://sil.gobernacion.gob.mx/Librerias/pp_PerfilLegislador.php',
        'photo_url' => 'http://sil.gobernacion.gob.mx/Archivos/Fotos',
        'timeout' => (int) $env('HTTP_TIMEOUT', '30'),
        'rate_limit_ms' => (int) $env('HTTP_RATE_LIMIT_MS', '1250'), // 1250ms + jitter aleatorio para modo ultra-silencioso y seguro
        'user_agent' => $env('HTTP_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'),
        // Verificación SSL: recomendado true. Algunos XAMPP en Windows no traen CA bundle; usar false solo en local.
        'verify_ssl' => $envBool('HTTP_VERIFY_SSL', false),
    ],
    // Plataforma Digital Nacional (SNA) — Sistema 3: servidores públicos y
    // particulares sancionados. FUENTE FUNDAMENTAL ANTICORRUPCIÓN de la suite.
    // API pública JSON sin autenticación; salida SIEMPRE a contraste, nunca a canónico.
    'pdn' => [
        'api_base' => 'https://api.plataformadigitalnacional.org/s3-wrapper',
        'portal_url' => 'https://www.plataformadigitalnacional.org/servidores',
        'providers_url' => 'https://api.plataformadigitalnacional.org/s3-wrapper/api/v1/providers',
        'timeout' => (int) $env('HTTP_TIMEOUT', '30'),
        'rate_limit_ms' => (int) $env('HTTP_RATE_LIMIT_MS', '1250'),
        'user_agent' => $env('HTTP_USER_AGENT', 'PulsoCivicoBot/1.0 (+https://github.com/elpulsocivico/pulso-civico)'),
        'verify_ssl' => $envBool('HTTP_VERIFY_SSL', true),
    ],
    'paths' => [
        'root' => dirname(__DIR__),
        'storage' => dirname(__DIR__) . '/storage',
        'raw_html' => dirname(__DIR__) . '/storage/raw/html',
        'raw_photos' => dirname(__DIR__) . '/storage/raw/photos',
        'data_json' => dirname(__DIR__) . '/storage/data/json',
        'logs' => dirname(__DIR__) . '/storage/logs',
    ],
];
