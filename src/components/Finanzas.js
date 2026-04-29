"use client";
/**
 * ============================================================================
 * COMPONENTE: Finanzas.js (v3.1.0 - INTEGRACIÓN TOTAL)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';

export default function FinanzasSection({ 
    ventas, productos, finanzas, balanceEliteBJ, valorizacionStockBJ, resumenGastosBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
}) {
    // --- 1. ESTADO PARA ARQUEO (TU LÓGICA ORIGINAL) ---
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

    // --- 2. CEREBRO ESTRATÉGICO (LO NUEVO) ---
    // --- FILTROS DE PRECISIÓN ---
    const finanzasValidas = finanzas?.filter(f => f != null) || [];

   // 1. Solo lo que es GASTO REAL del negocio (Local, Marketing, Logística, Personal)
    // 👈 FIX: Ahora recibe 'descripcion' para poder ignorar el cuadre
    const esGastoOperativo = (tipo, descripcion) => {
        const t = tipo?.toLowerCase() || "";
        const d = descripcion?.toUpperCase() || "";
        const esBase = t.includes("local") || t.includes("marketing") || t.includes("logística");
        const esSueldo = t.includes("personal");
        const noEsCuadre = !d.includes("CUADRE");
        
        return (esBase || esSueldo) && noEsCuadre;
    };

    // 2. Calculamos los totales globales pasando descripción al filtro
   const gastoMarketing = finanzasValidas.filter(f => f.tipo?.toLowerCase().includes("marketing")).reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const totalGastosOperativosGlobal = finanzasValidas
        .filter(f => esGastoOperativo(f.tipo, f.descripcion))
        .reduce((acc, f) => acc + Number(f.monto || 0), 0);
    
    // Con esto, la utilidad neta ya no incluirá el ajuste de 19k
    const utilidadNetaReal = (balanceEliteBJ?.pe_g || 0) - totalGastosOperativosGlobal;

    // --- 3. MOTORES DE CÁLCULO POR PERIODOS (TU ESTRUCTURA ORIGINAL) ---
    const procesarPeriodo = (filtradasVentas, filtradasFinanzas) => {
        const totalVendido = filtradasVentas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
        const utilidadGanada = filtradasVentas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
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
        
        const fFiltradas = finanzas.filter(f => {
            const fecha = new Date(f.created_at);
            // 👈 FIX CRÍTICO: Ahora pasamos f.descripcion para que el "CUADRE" sea ignorado aquí también
            return fecha >= limite && esGastoOperativo(f.tipo, f.descripcion);
        });
        
        return procesarPeriodo(vFiltradas, fFiltradas);
    };

   const calcularMetricasMes = () => {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const vFiltradas = ventas.filter(v => { 
            const f = new Date(v.created_at); 
            return f.getMonth() === mesActual && f.getFullYear() === anioActual && v.estado_pedido !== 'Anulado'; 
        });

        // Sincronizado: Filtra los gastos del mes usando la misma regla de Local/Logística/Personal
        const fFiltradas = finanzas.filter(f => { 
            const fz = new Date(f.created_at); 
            return fz.getMonth() === mesActual && fz.getFullYear() === anioActual && esGastoOperativo(f.tipo, f.descripcion); 
        });

        return procesarPeriodo(vFiltradas, fFiltradas);
    };

    const periodos = [
        { label: 'ÚLTIMOS 7 DÍAS', data: calcularMetricasDias(7) },
        { label: 'ÚLTIMOS 14 DÍAS', data: calcularMetricasDias(14) },
        { label: 'ÚLTIMOS 21 DÍAS', data: calcularMetricasDias(21) },
        { label: 'MES EN CURSO', data: calcularMetricasMes() }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', fontFamily: "'Poppins', sans-serif" }}>
            
            {/* --- 1. ARQUEO DE FLUJO (TAL CUAL LO TENÍAS) --- */}
            <div style={{ ...styleCrd, border: `3px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: OSCURO_BJ, fontWeight: '900' }}>🧮 Arqueo de Caja (Distribución)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '20px', border: `2px dashed ${OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', color: OSCURO_BJ, display: 'block', marginBottom: '10px' }}>💵 EFECTIVO EN MOSTRADOR (S/)</small>
                        <input type="number" value={efectivoFisico} onChange={(e) => handleInputEfectivo(e.target.value)} placeholder="0.00" 
                               style={{ ...styleInp, border: 'none', borderBottom: `3px solid ${OSCURO_BJ}`, borderRadius: 0, padding: '10px 0', fontSize: '2rem', fontWeight: '900', backgroundColor: 'transparent' }} />
                    </div>
                    <div style={{ backgroundColor: dineroDigital < 0 ? '#FEF2F2' : `${VERDE_BJ}10`, padding: '20px', borderRadius: '20px', border: `2px dashed ${dineroDigital < 0 ? ROJO_BJ : VERDE_BJ}` }}>
                        <small style={{ fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ, display: 'block', marginBottom: '10px' }}>📱 DIGITAL (YAPE/PLIN/BANCO)</small>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: dineroDigital < 0 ? ROJO_BJ : VERDE_BJ }}>S/ {dineroDigital.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* --- 2. DASHBOARD DE INTELIGENCIA (NUEVO) --- */}
            <h2 style={{ color: OSCURO_BJ, margin: '10px 0 0 0', fontSize: '1.4rem', fontWeight: '900' }}>📊 Inteligencia y Salud Financiera</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, borderLeft: `10px solid ${utilidadNetaReal > 0 ? VERDE_BJ : ROJO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>💰 UTILIDAD NETA REAL (TOTAL)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0', color: utilidadNetaReal > 0 ? VERDE_BJ : ROJO_BJ}}>S/ {utilidadNetaReal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                    <span style={{fontSize:'10px', opacity:0.5}}>Ganancia bruta menos gastos operativos.</span>
                </div>

                <div style={{ ...styleCrd, background: '#E0F2FE', border: 'none' }}>
                    <small style={{fontWeight:'900', color: '#0369A1', fontSize:'11px'}}>📢 MARKETING ROI</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0', color: '#0369A1'}}>S/ {gastoMarketing.toFixed(2)}</h4>
                    <p style={{fontSize:'11px', color: '#0369A1', fontWeight: '700'}}>Retorno: {gastoMarketing > 0 ? ((balanceEliteBJ?.pe_g || 0) / gastoMarketing).toFixed(1) : 0}x</p>
                </div>

                <div style={{ ...styleCrd, background: OSCURO_BJ, color: '#fff' }}>
                    <small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', opacity: 0.9, fontSize: '11px' }}>🏦 LA BÓVEDA</small>
                    <div style={{ fontSize: '2rem', fontWeight: '900', margin: '10px 0' }}>S/ {(balanceEliteBJ?.bR || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</div>
                </div>
            </div>

            {/* --- 3. CAPITAL Y STOCK --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={styleCrd}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>📦 VALOR DEL ALMACÉN</small>
                    <h4 style={{fontSize:'1.8rem', margin:'5px 0'}}>S/ {(valorizacionStockBJ?.cost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft: `10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>🏦 CAJA FÍSICA GLOBAL</small>
                    <h4 style={{fontSize:'1.8rem', margin:'5px 0'}}>S/ {cajaTotal.toFixed(2)}</h4>
                </div>
            </div>

            {/* --- 4. PERIODOS COMPARATIVOS (TU ESTRUCTURA ORIGINAL) --- */}
            <h2 style={{ color: OSCURO_BJ, margin: '10px 0 0 0', fontSize: '1.4rem', fontWeight: '900' }}>📈 Histórico por Periodos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {periodos.map((p, i) => (
                    <div key={i} style={{ ...styleCrd, borderTop: `8px solid ${i === 3 ? FUCSIA_PRINCIPAL : OSCURO_BJ}` }}>
                        <small style={{ fontWeight: '900', opacity: 0.5, letterSpacing: '1px' }}>{p.label}</small>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#64748B' }}>TOTAL VENDIDO</small>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {p.data.totalVendido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '15px', border: `1px dashed ${VERDE_BJ}` }}>
                                    <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: VERDE_BJ }}>PROFIT</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: VERDE_BJ }}>S/ {p.data.utilidadGanada.toFixed(2)}</div>
                                </div>
                                <div style={{ backgroundColor: `${ROJO_BJ}10`, padding: '15px', borderRadius: '15px', border: `1px dashed ${ROJO_BJ}` }}>
                                    <small style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: ROJO_BJ }}>BURN (LOCAL)</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: ROJO_BJ }}>S/ {p.data.gastosOperativos.toFixed(2)}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '15px' }}>
                                <small style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '10px' }}>🏆 TOP 5 PRODUCTOS</small>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {p.data.top5.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idx + 1}. {item[0]}</span>
                                            <strong style={{ color: FUCSIA_PRINCIPAL }}>{item[1]}u</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* --- CUADRO RESUMEN DE EGRESOS E INGRESOS --- */}
  <div style={{ ...styleCrd, marginBottom: '30px', borderLeft: `8px solid ${FUCSIA_PRINCIPAL}` }}>
    <h3 style={{ marginTop: 0, color: OSCURO_BJ, fontWeight: '900', fontSize: '1.2rem' }}>📊 Resumen Operativo</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '20px' }}>
      
      <div style={{ padding: '15px', background: '#F1F5F9', borderRadius: '15px' }}>
        <small style={{ opacity: 0.6, fontWeight: '900', fontSize: '10px' }}>🏠 GASTOS LOCALES</small>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {resumenGastosBJ.local.toFixed(2)}</div>
      </div>

      <div style={{ padding: '15px', background: '#F1F5F9', borderRadius: '15px' }}>
        <small style={{ opacity: 0.6, fontWeight: '900', fontSize: '10px' }}>🚚 LOGÍSTICA</small>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {resumenGastosBJ.logistica.toFixed(2)}</div>
      </div>

      <div style={{ padding: '15px', background: '#F1F5F9', borderRadius: '15px' }}>
        <small style={{ opacity: 0.6, fontWeight: '900', fontSize: '10px' }}>📱 ADS / MARKETING</small>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0369A1' }}>S/ {resumenGastosBJ.ads.toFixed(2)}</div>
      </div>

      <div style={{ padding: '15px', background: `${VERDE_BJ}10`, borderRadius: '15px' }}>
        <small style={{ opacity: 0.6, fontWeight: '900', fontSize: '10px', color: VERDE_BJ }}>💰 INGRESOS ADIC.</small>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: VERDE_BJ }}>S/ {resumenGastosBJ.adicional.toFixed(2)}</div>
      </div>

      <div style={{ padding: '15px', background: `${ROJO_BJ}10`, borderRadius: '15px' }}>
        <small style={{ opacity: 0.6, fontWeight: '900', fontSize: '10px', color: ROJO_BJ }}>👤 RETIROS PERSONALES</small>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: ROJO_BJ }}>S/ {resumenGastosBJ.personal.toFixed(2)}</div>
        <small style={{ fontSize: '9px', opacity: 0.5 }}>Excluye Cuadre de Caja</small>
      </div>

    </div>
  </div>
        </div>
    );
}