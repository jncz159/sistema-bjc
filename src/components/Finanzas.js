"use client";
/**
 * ============================================================================
 * COMPONENTE: Finanzas.js (v2.0.0 PANEL DE INTELIGENCIA)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * FUNCIONALIDAD: 
 * - Distribuidor de Flujo (Físico vs Digital) sin alterar la caja.
 * - Termómetro de Gastos Operativos.
 * - Ranking de los 5 productos más vendidos.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';

export default function FinanzasSection({ 
    ventas, productos, finanzas, balanceEliteBJ, 
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
}) {
    // --- ESTADO PARA DISTRIBUCIÓN DE CAJA ---
    // Usamos localStorage para que no se borre si cambias de pestaña
    const [efectivoFisico, setEfectivoFisico] = useState('');

    useEffect(() => {
        const guardado = localStorage.getItem('bj_efectivo_fisico');
        if (guardado) setEfectivoFisico(guardado);
    }, []);

    const handleInputEfectivo = (val) => {
        setEfectivoFisico(val);
        localStorage.setItem('bj_efectivo_fisico', val);
    };

    const cajaTotal = balanceEliteBJ?.cG || 0;
    const dineroDigital = cajaTotal - Number(efectivoFisico || 0);

    // --- MOTORES DE CÁLCULO ---
    const procesarPeriodo = (filtradasVentas, filtradasFinanzas) => {
        const totalVendido = filtradasVentas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
        const utilidadGanada = filtradasVentas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        const gastosOperativos = filtradasFinanzas.reduce((acc, f) => acc + Number(f.monto), 0);
        
        // Ranking Top 5
        const conteo = {};
        filtradasVentas.forEach(v => {
            const pNombre = productos.find(p => p.id === v.producto_id)?.nombre || "Modelo Eliminado";
            conteo[pNombre] = (conteo[pNombre] || 0) + v.cantidad;
        });
        const top5 = Object.entries(conteo).sort((a,b) => b[1] - a[1]).slice(0, 5);

        return { totalVendido, utilidadGanada, gastosOperativos, top5 };
    };

    const calcularMetricasDias = (dias) => {
        const limite = new Date();
        limite.setDate(limite.getDate() - dias);

        const vFiltradas = ventas.filter(v => new Date(v.created_at) >= limite && v.estado_pedido !== 'Anulado');
        const fFiltradas = finanzas.filter(f => new Date(f.created_at) >= limite && f.tipo === 'Gasto Local');
        
        return procesarPeriodo(vFiltradas, fFiltradas);
    };

    const calcularMetricasMes = () => {
        const mesActual = new Date().getMonth();
        const anioActual = new Date().getFullYear();

        const vFiltradas = ventas.filter(v => { const f = new Date(v.created_at); return f.getMonth() === mesActual && f.getFullYear() === anioActual && v.estado_pedido !== 'Anulado'; });
        const fFiltradas = finanzas.filter(f => { const fz = new Date(f.created_at); return fz.getMonth() === mesActual && fz.getFullYear() === anioActual && f.tipo === 'Gasto Local'; });
        
        return procesarPeriodo(vFiltradas, fFiltradas);
    };

    const periodos = [
        { label: 'ÚLTIMOS 7 DÍAS', data: calcularMetricasDias(7) },
        { label: 'ÚLTIMOS 14 DÍAS', data: calcularMetricasDias(14) },
        { label: 'ÚLTIMOS 21 DÍAS', data: calcularMetricasDias(21) },
        { label: 'MES EN CURSO', data: calcularMetricasMes() }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* --- 1. SECCIÓN DE ARQUEO DE FLUJO --- */}
            <div style={{ ...styleCrd, border: `3px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: OSCURO_BJ, fontWeight: '900' }}>🧮 Arqueo de Caja (Distribución)</h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: 0, marginBottom: '20px' }}>
                    Tu caja actual es de <strong>S/ {cajaTotal.toFixed(2)}</strong>. Ingresa cuánto dinero tienes en billetes físicos; el sistema calculará automáticamente el resto en digital.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '20px', border: `2px dashed ${OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', color: OSCURO_BJ, display: 'block', marginBottom: '10px' }}>💵 EFECTIVO EN MOSTRADOR (S/)</small>
                        <input 
                            type="number" 
                            value={efectivoFisico} 
                            onChange={(e) => handleInputEfectivo(e.target.value)} 
                            placeholder="0.00" 
                            style={{ ...styleInp, border: 'none', borderBottom: `3px solid ${OSCURO_BJ}`, borderRadius: 0, padding: '10px 0', fontSize: '2rem', fontWeight: '900', backgroundColor: 'transparent' }} 
                        />
                    </div>

                    <div style={{ backgroundColor: dineroDigital < 0 ? '#FEF2F2' : `${VERDE_BJ}10`, padding: '20px', borderRadius: '20px', border: `2px dashed ${dineroDigital < 0 ? ROJO_BJ : VERDE_BJ}` }}>
                        <small style={{ fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ, display: 'block', marginBottom: '10px' }}>
                            📱 YAPE / PLIN / BANCO (S/)
                        </small>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ }}>
                            S/ {dineroDigital.toFixed(2)}
                        </div>
                        {dineroDigital < 0 && <small style={{ color: ROJO_BJ, fontWeight: '900', display: 'block', marginTop: '5px' }}>⚠️ Has ingresado más efectivo del que existe en el sistema.</small>}
                    </div>
                </div>
            </div>

            <h2 style={{ color: OSCURO_BJ, margin: '10px 0 0 0', fontSize: '1.4rem', fontWeight: '900' }}>📊 Inteligencia Financiera</h2>
            
            {/* --- 2. PERIODOS COMPARATIVOS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {periodos.map((p, i) => (
                    <div key={i} style={{ ...styleCrd, borderTop: `8px solid ${i === 3 ? FUCSIA_PRINCIPAL : OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', opacity: 0.5, letterSpacing: '1px' }}>{p.label}</small>
                        
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* MÉTRICAS */}
                            <div>
                                <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#64748B' }}>TOTAL VENDIDO (INGRESO BRUTO)</small>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {p.data.totalVendido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '15px', border: `1px dashed ${VERDE_BJ}` }}>
                                    <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: VERDE_BJ }}>UTILIDAD (PROFIT)</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: VERDE_BJ }}>S/ {p.data.utilidadGanada.toFixed(2)}</div>
                                </div>
                                <div style={{ backgroundColor: `${ROJO_BJ}10`, padding: '15px', borderRadius: '15px', border: `1px dashed ${ROJO_BJ}` }}>
                                    <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: ROJO_BJ }}>GASTOS (BURN RATE)</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: ROJO_BJ }}>S/ {p.data.gastosOperativos.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* PODIO TOP 5 */}
                            <div style={{ marginTop: '10px', backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '15px' }}>
                                <small style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '10px' }}>🏆 TOP 5 MÁS VENDIDOS</small>
                                {p.data.top5.length === 0 ? (
                                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>Sin ventas registradas.</span>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {p.data.top5.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{idx + 1}. {item[0]}</span>
                                                <strong style={{ color: FUCSIA_PRINCIPAL }}>{item[1]}u</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}