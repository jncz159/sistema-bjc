"use client";
/**
 * ============================================================================
 * COMPONENTE: Logistica.js (v106.1 - FIX COLOR)
 * ESTADO: CORREGIDO REFERENCIA ROJO_BJ + GESTIÓN DE ABONOS
 * ============================================================================
 */
import React from 'react';

export default function LogisticaSection({
    logisticaInteligente, handleCobrarDeudaBJ, finanzas,
    FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* SECCIÓN: ENTREGAS PENDIENTES */}
            <div style={styleCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.almacen?.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', margin: '15px 0' }}>
                                {grupo.items?.map((it, i) => (
                                    <div key={i} style={{ fontSize: '14px' }}>• {it.cantidad}x {it.nombre} ({it.color})</div>
                                ))}
                            </div>
                            <button 
                                onClick={() => handleCobrarDeudaBJ(grupo, 0)} 
                                style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}
                            >
                                MARCAR ENTREGADO ✅
                            </button>
                        </div>
                    ))}
                    {(!logisticaInteligente?.almacen || logisticaInteligente.almacen.length === 0) && <p style={{opacity:0.5}}>No hay paquetes listos para entrega.</p>}
                </div>
            </div>

            {/* SECCIÓN: CUENTAS DEUDORAS (CON CÁLCULO DE ABONOS) */}
            <div style={{ ...styleCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Créditos y Abonos)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.deudas?.map((grupo, idx) => {
                        // Buscamos abonos específicos registrados en Finanzas para este cliente
                        const abonosEncontrados = finanzas?.filter(f => 
                            f.descripcion?.includes(`Abono inicial venta crédito: ${grupo.cliente}`) || 
                            f.descripcion?.includes(`Abono parcial: ${grupo.cliente}`)
                        ).reduce((acc, f) => acc + Number(f.monto), 0) || 0;
                        
                        const saldoPendienteBJ = grupo.total - abonosEncontrados;

                        return (
                            <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border: '1px solid #FEF3C7' }}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <strong>{grupo.cliente}</strong>
                                    <span style={{fontSize:'10px', backgroundColor: AMARILLO_BJ, color:'#fff', padding:'2px 8px', borderRadius:'10px'}}>CRÉDITO</span>
                                </div>
                                <small>{grupo.localidad}</small>
                                
                                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', margin: '15px 0', border:'1px solid #FDE68A' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px', marginBottom:'5px' }}>
                                        <span>Total de la Venta:</span>
                                        <strong>S/ {grupo.total.toFixed(2)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px', color: VERDE_BJ }}>
                                        <span>Abonado a la fecha:</span>
                                        <strong>S/ {abonosEncontrados.toFixed(2)}</strong>
                                    </div>
                                    <hr style={{ border:'0.5px solid #F3F4F6', margin:'10px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: ROJO_BJ, fontSize: '1.2rem', fontWeight:'900' }}>
                                        <span>RESTA PAGAR:</span>
                                        <span>S/ {saldoPendienteBJ.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleCobrarDeudaBJ(grupo, saldoPendienteBJ)} 
                                    disabled={saldoPendienteBJ <= 0}
                                    style={{ 
                                        width: '100%', 
                                        backgroundColor: saldoPendienteBJ <= 0 ? '#94A3B8' : VERDE_BJ, 
                                        color: '#fff', 
                                        border: 'none', 
                                        padding: '18px', 
                                        borderRadius: '15px', 
                                        fontWeight: '900', 
                                        cursor: saldoPendienteBJ <= 0 ? 'default' : 'pointer',
                                        boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)'
                                    }}
                                >
                                    {saldoPendienteBJ <= 0 ? 'PAGO COMPLETADO' : '💰 REGISTRAR COBRO FINAL'}
                                </button>
                            </div>
                        );
                    })}
                    {(!logisticaInteligente?.deudas || logisticaInteligente.deudas.length === 0) && <p style={{opacity:0.5}}>No hay deudas pendientes.</p>}
                </div>
            </div>
        </div>
    );
}