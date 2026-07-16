package com.example.finanzas.model;

import com.example.finanzas.model.enums.TipoMovimientoEnum;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transaccion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TransaccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    private TipoMovimientoEnum tipoMovimiento;

    @ManyToOne
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaEntity categoria;

    @Column(nullable = false)
    private BigDecimal importe;

    private String descripcion;

    private LocalDate fechaTransaccion;

    @ManyToOne
    @JoinColumn(name = "cuenta_id", nullable = false)
    private CuentaEntity cuenta;

    @Transient
    public BigDecimal getImporteConSigno() {
        boolean resta = tipoMovimiento == TipoMovimientoEnum.GASTO || tipoMovimiento == TipoMovimientoEnum.INVERSION;
        return resta ? importe.negate() : importe;
    }
}
