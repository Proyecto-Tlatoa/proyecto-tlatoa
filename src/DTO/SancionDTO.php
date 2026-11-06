<?php
declare(strict_types=1);

namespace PulsoCivico\DTO;

/**
 * Data Transfer Object que representa una sanción firme a una persona servidora
 * pública, tomada del Sistema 3 de la Plataforma Digital Nacional (SNA).
 *
 * REGLA DE PRIVACIDAD: solo se admiten campos públicos inherentes al cargo.
 * Quedan EXCLUIDOS por diseño: RFC, CURP, domicilio, teléfono personal,
 * correo personal, montos patrimoniales y cualquier dato de declaraciones
 * patrimoniales (Sistema 1 de la PDN). Si la API devolviera alguno de esos
 * campos, fromArray() lo descarta y nunca llega a toArray().
 */
class SancionDTO
{
    /** Claves que nunca se almacenan, aunque la fuente las entregue. */
    public const CAMPOS_PROHIBIDOS = [
        'rfc', 'curp', 'domicilio', 'telefono', 'telefono_personal',
        'correo_personal', 'monto', 'patrimonio', 'ingreso', 'bien_inmueble',
        'bien_mueble', 'cuenta_bancaria', 'adeudo',
    ];

    public function __construct(
        public readonly string $idRegistro,
        public readonly ?string $nombreCompleto,
        public readonly ?string $cargoDenominacion,
        public readonly ?string $nombreEntePublico,
        public readonly ?string $entidadFederativa,
        public readonly ?string $nivelOrdenGobierno,
        public readonly ?string $ambitoPublico,
        public readonly ?string $faltaCometida,
        public readonly ?string $descripcionHechos,
        public readonly ?string $expediente,
        public readonly ?string $tituloResolucion,
        public readonly ?string $fechaResolucion,
        public readonly ?string $fechaResolucionFirme,
        public readonly ?string $autoridadResolutora,
        public readonly ?string $tipoSancion,
        public readonly ?string $proveedor,
        public readonly ?string $fuenteUrl = null,
        public readonly ?string $fechaExtraccion = null,
        public readonly ?string $sha256 = null
    ) {
    }

    /**
     * Construye el DTO desde un registro crudo de la API del Sistema 3.
     * Descarta cualquier campo prohibido, aunque venga en el payload.
     */
    public static function fromPdnS3(array $registro, string $proveedor, ?string $fuenteUrl = null): self
    {
        $datos = $registro['datosGenerales'] ?? [];
        $empleo = $registro['empleoCargoComision'] ?? [];
        $falta = $registro['faltaCometida'][0] ?? [];
        $resolucion = $registro['resolucion'] ?? [];

        $nombres = trim((string)($datos['nombres'] ?? ''));
        $apellidoUno = trim((string)($datos['primerApellido'] ?? ''));
        $apellidoDos = trim((string)($datos['segundoApellido'] ?? ''));
        $nombreCompleto = trim("{$nombres} {$apellidoUno} {$apellidoDos}");
        if ($nombreCompleto === '') {
            $nombreCompleto = null;
        }

        $claveEntidad = (string)($empleo['entidadFederativa'] ?? '');
        $entidad = $claveEntidad !== '' ? self::nombreEntidad((int)$claveEntidad) : null;

        return new self(
            idRegistro: (string)($registro['id'] ?? ''),
            nombreCompleto: $nombreCompleto,
            cargoDenominacion: self::limpiar($empleo['denominacion'] ?? null),
            nombreEntePublico: self::limpiar($empleo['nombreEntePublico'] ?? null),
            entidadFederativa: $entidad,
            nivelOrdenGobierno: self::limpiar($empleo['nivelOrdenGobierno'] ?? null),
            ambitoPublico: self::limpiar($empleo['ambitoPublico'] ?? null),
            faltaCometida: self::limpiar($falta['clave'] ?? null),
            descripcionHechos: self::limpiar($falta['descripcionHechos'] ?? null),
            expediente: self::limpiar($registro['expediente'] ?? null),
            tituloResolucion: self::limpiar($resolucion['tituloResolucion'] ?? null),
            fechaResolucion: self::fechaIso($resolucion['fechaResolucion'] ?? null),
            fechaResolucionFirme: self::fechaIso($resolucion['fechaResolucionFirme'] ?? null),
            autoridadResolutora: self::limpiar($resolucion['autoridadResolutora'] ?? null),
            tipoSancion: self::limpiar($registro['tipoSancion'] ?? null),
            proveedor: $proveedor,
            fuenteUrl: $fuenteUrl,
            fechaExtraccion: (new \DateTimeImmutable())->format('Y-m-d')
        );
    }

    /**
     * Serializa a arreglo JSON (snake_case, UTF-8, null para desconocidos).
     * Por construcción, ningún campo prohibido puede aparecer aquí.
     */
    public function toArray(): array
    {
        return [
            'id_registro' => $this->idRegistro,
            'nombre_completo' => $this->nombreCompleto,
            'cargo_denominacion' => $this->cargoDenominacion,
            'nombre_ente_publico' => $this->nombreEntePublico,
            'entidad_federativa' => $this->entidadFederativa,
            'nivel_orden_gobierno' => $this->nivelOrdenGobierno,
            'ambito_publico' => $this->ambitoPublico,
            'falta_cometida' => $this->faltaCometida,
            'descripcion_hechos' => $this->descripcionHechos,
            'expediente' => $this->expediente,
            'titulo_resolucion' => $this->tituloResolucion,
            'fecha_resolucion' => $this->fechaResolucion,
            'fecha_resolucion_firme' => $this->fechaResolucionFirme,
            'autoridad_resolutora' => $this->autoridadResolutora,
            'tipo_sancion' => $this->tipoSancion,
            'proveedor' => $this->proveedor,
            'fuente_url' => $this->fuenteUrl,
            'fecha_extraccion' => $this->fechaExtraccion,
            'sha256' => $this->sha256,
        ];
    }

    /** Nombre oficial INEGI de la entidad por su clave numérica (1-32). */
    public static function nombreEntidad(int $clave): ?string
    {
        return \PulsoCivico\Services\SilIngestService::ENTIDADES[$clave] ?? null;
    }

    private static function limpiar(mixed $valor): ?string
    {
        if (!is_string($valor)) {
            return null;
        }
        $valor = trim(preg_replace('/\s+/', ' ', $valor) ?? '');
        return $valor === '' ? null : $valor;
    }

    /** Normaliza una fecha a YYYY-MM-DD; null si no es válida. */
    private static function fechaIso(mixed $valor): ?string
    {
        if (!is_string($valor) || trim($valor) === '') {
            return null;
        }
        $fecha = \DateTimeImmutable::createFromFormat('Y-m-d', substr(trim($valor), 0, 10));
        return $fecha !== false ? $fecha->format('Y-m-d') : null;
    }
}
