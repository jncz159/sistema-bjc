"use client";
import React from 'react';

export default function FinanzasSection({ ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd }) {
    const calcularMetricas = (dias) => {
        const ahora = new Date();
        const limite = new Date();
        limite.setDate(ahora.getDate() - dias);

        const filtradas = ventas.filter(v => {
            const fVenta = new Date(v.created_at);
            return fVenta >= limite && v.estado_pedido !== 'Anulado';
        });

        const totalVendido = filtradas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
        const utilidadGanada = filtradas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        return { totalVendido, utilidadGanada };
    };

    const metricasMes = () => {
        const mesActual = new Date().getMonth();
        const anioActual = new Date().getFullYear();
        const filtradas = ventas.filter(v => {
            const f = new Date(v.created_at);
            return f.getMonth() === mesActual && f.getFullYear() === anioActual && v.estado_pedido !== 'Anulado';
        });

        const totalVendido = filtradas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
        const utilidadGanada = filtradas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        return { totalVendido, utilidadGanada };
    };

    const periodos = [
        { label: 'ÚLTIMOS 7 DÍAS', data: calcularMetricas(7) },
        { label: 'ÚLTIMOS 14 DÍAS', data: calcularMetricas(14) },
        { label: 'ÚLTIMOS 21 DÍAS', data: calcularMetricas(21) },
        { label: 'MES EN CURSO', data: metricasMes() }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <h2 style={{ color: OSCURO_BJ, margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: '900' }}>📊 Inteligencia Financiera</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {periodos.map((p, i) => (
                    <div key={i} style={{ ...styleCrd, borderTop: `8px solid ${i === 3 ? FUCSIA_PRINCIPAL : OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', opacity: 0.5, letterSpacing: '1px' }}>{p.label}</small>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#64748B' }}>TOTAL VENDIDO (INGRESO BRUTO)</small>
                                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {p.data.totalVendido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '15px', border: `1px dashed ${VERDE_BJ}` }}>
                                <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: VERDE_BJ }}>UTILIDAD REAL (GANANCIA)</small>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: VERDE_BJ }}>S/ {p.data.utilidadGanada.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}