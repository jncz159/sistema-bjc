"use client";
/**
 * ============================================================================
 * COMPONENTE: Finanzas.js (v3.0.0 ESTRATEGIA TOTAL)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * FUNCIONALIDAD: 
 * - Arqueo de Flujo (Físico vs Digital).
 * - Inteligencia ROI & Utilidad Neta Real (Post-Gastos).
 * - Bóveda, Capital en Stock y Caja Global.
 * - Análisis por periodos y Ranking Top 5.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';

export default function FinanzasSection({ 
    ventas, productos, finanzas, balanceEliteBJ, valorizacionStockBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
}) {
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

    // --- 1. CÁLCULOS ESTRATÉGICOS (EL CEREBRO) ---
    const finanzasValidas = finanzas?.filter(f => f != null) || [];
    
    // Categorías para ROI y Utilidad
    const gastoMarketing = finanzasValidas.filter(f => f.tipo === "📢 Marketing Ads").reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const gastoLogistica = finanzasValidas.filter(f => f.tipo === "🚚 Logística/Envío").reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const gastoLocal = finanzasValidas.filter(f => f.tipo === "🏠 Gastos Local").reduce((acc, f) => acc + Number(f.monto || 0), 0);
    
    const totalGastosOperativos = gastoMarketing + gastoLogistica + gastoLocal;
    const utilidadNetaReal = (balanceEliteBJ?.pe_g || 0) - totalGastosOperativos;

    // --- 2. MOTORES DE CÁLCULO PARA PERIODOS ---
    const procesarPeriodo = (filtradasVentas, filtradasFinanzas) => {
        const totalVendido = filtradasVentas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
        const utilidadGanada = filtradasVentas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        
        // Ahora el gasto en el periodo suma LOCAL + MARKETING + LOGÍSTICA
        const gastosOperativos = filtradasFinanzas.reduce((acc, f) => acc + Number(f.monto), 0);
        
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
        const fFiltradas = finanzas.filter(f => new Date(f.created_at) >= limite && ["🏠 Gastos Local", "📢 Marketing Ads", "🚚 Logística/Envío"].includes(f.tipo));
        return procesarPeriodo(vFiltradas, fFiltradas);
    };

    const periodos = [
        { label: 'ÚLTIMOS 7 DÍAS', data: calcularMetricasDias(7) },
        { label: 'MES EN CURSO', data: calcularMetricasDias(30) } // Ajustado para ser más exacto
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', fontFamily: "'Poppins', sans-serif" }}>
            
            {/* --- SECCIÓN 1: ARQUEO DE FLUJO --- */}
            <div style={{ ...styleCrd, border: `3px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: OSCURO_BJ, fontWeight: '900' }}>🧮 Arqueo de Caja (Distribución Real)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '20px' }}>
                        <small style={{ fontWeight: '900', color: OSCURO_BJ, display: 'block', marginBottom: '10px' }}>💵 EFECTIVO EN MANO (S/)</small>
                        <input type="number" value={efectivoFisico} onChange={(e) => handleInputEfectivo(e.target.value)} placeholder="0.00" 
                               style={{ ...styleInp, border: 'none', borderBottom: `3px solid ${OSCURO_BJ}`, borderRadius: 0, padding: '10px 0', fontSize: '2rem', fontWeight: '900', backgroundColor: 'transparent' }} />
                    </div>
                    <div style={{ backgroundColor: dineroDigital < 0 ? '#FEF2F2' : `${VERDE_BJ}10`, padding: '20px', borderRadius: '20px', border: `2px dashed ${dineroDigital < 0 ? ROJO_BJ : VERDE_BJ}` }}>
                        <small style={{ fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ, display: 'block', marginBottom: '10px' }}>📱 DIGITAL (YAPE/PLIN/BANCO)</small>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ }}>S/ {dineroDigital.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: INDICADORES ESTRATÉGICOS (LO NUEVO) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, borderLeft: `10px solid ${utilidadNetaReal > 0 ? VERDE_BJ : ROJO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>💰 UTILIDAD NETA REAL</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0', color: utilidadNetaReal > 0 ? VERDE_BJ : ROJO_BJ}}>S/ {utilidadNetaReal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                    <span style={{fontSize:'10px', opacity:0.5}}>Ganancia bruta menos todos los gastos operativos.</span>
                </div>

                <div style={{ ...styleCrd, background: '#E0F2FE', border: 'none' }}>
                    <small style={{fontWeight:'900', color: '#0369A1', fontSize:'11px'}}>📢 MARKETING ROI</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0', color: '#0369A1'}}>S/ {gastoMarketing.toFixed(2)}</h4>
                    <p style={{fontSize:'11px', color: '#0369A1', fontWeight:'700'}}>Retorno Est: {gastoMarketing > 0 ? ((balanceEliteBJ?.pe_g || 0) / gastoMarketing).toFixed(1) : 0}x</p>
                </div>

                <div style={{ ...styleCrd, background: OSCURO_BJ, color: '#fff' }}>
                    <small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', opacity: 0.9, fontSize: '11px' }}>🏦 LA BÓVEDA</small>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '10px 0' }}>S/ {(balanceEliteBJ?.bR || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</div>
                    <small style={{ opacity:0.5, fontSize:'10px' }}>Capital acumulado para reinversión.</small>
                </div>
            </div>

            {/* --- SECCIÓN 3: CAPITAL Y CAJA --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={styleCrd}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>📦 CAPITAL EN MERCADERÍA</small>
                    <h4 style={{fontSize:'1.8rem', margin:'5px 0'}}>S/ {(valorizacionStockBJ?.cost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft: `10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>🏦 CAJA GLOBAL ACTUAL</small>
                    <h4 style={{fontSize:'1.8rem', margin:'5px 0'}}>S/ {cajaTotal.toFixed(2)}</h4>
                </div>
            </div>

            {/* --- SECCIÓN 4: HISTÓRICO Y TOP 5 --- */}
            <h2 style={{ color: OSCURO_BJ, margin: '20px 0 0 0', fontSize: '1.4rem', fontWeight: '900' }}>📈 Histórico y Tendencias</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                {periodos.map((p, i) => (
                    <div key={i} style={{ ...styleCrd, borderTop: `8px solid ${OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', opacity: 0.5 }}>{p.label}</small>
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ backgroundColor: `${VERDE_BJ}05`, padding: '15px', borderRadius: '15px' }}>
                                    <small style={{ display: 'block', fontSize: '10px', color: VERDE_BJ, fontWeight:'900' }}>PROFIT</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: VERDE_BJ }}>S/ {p.data.utilidadGanada.toFixed(2)}</div>
                                </div>
                                <div style={{ backgroundColor: `${ROJO_BJ}05`, padding: '15px', borderRadius: '15px' }}>
                                    <small style={{ display: 'block', fontSize: '10px', color: ROJO_BJ, fontWeight:'900' }}>BURN RATE</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: ROJO_BJ }}>S/ {p.data.gastosOperativos.toFixed(2)}</div>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '15px' }}>
                                <small style={{ display: 'block', fontSize: '11px', fontWeight: '900', marginBottom: '10px' }}>🏆 TOP 5 PRODUCTOS</small>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {p.data.top5.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span>{idx + 1}. {item[0]}</span>
                                            <strong style={{ color: FUCSIA_PRINCIPAL }}>{item[1]}u</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}