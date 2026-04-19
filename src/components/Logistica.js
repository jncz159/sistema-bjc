"use client";
/**
 * ============================================================================
 * COMPONENTE: Logistica.js (v1.1 STABLE)
 * ESTADO: DETALLE DE PRODUCTOS + ANULACIÓN DE CRÉDITOS + CAJA REVERSA
 * ============================================================================
 */
import React from 'react';

export default function LogisticaSection({
    logisticaInteligente, handleCobrarDeudaBJ, handleAnularCreditoBJ, finanzas,
    FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* --- SECCIÓN: ENTREGAS PENDIENTES --- */}
            <div style={styleCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.almacen?.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '35px', backgroundColor: '#fff' }}>
                            <div style={{marginBottom: '15px'}}>
                                <strong style={{fontSize: '1.2rem'}}>{grupo.cliente}</strong>
                                <br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
                                {grupo.items?.map((it, i) => (
                                    <div key={i} style={{ fontSize: '14px', marginTop: '5px' }}>• <strong>{it.cantidad}x</strong> {it.nombre} <small>({it.color})</small></div>
                                ))}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo, 0)} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- SECCIÓN: CUENTAS DEUDORAS --- */}
            <div style={{ ...styleCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Créditos)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.deudas?.map((grupo, idx) => {
                        // Cálculo de abonos iniciales (dinero que ya entró a caja)
                        const abonoReal = finanzas?.filter(f => f.descripcion?.includes(`Abono inicial venta crédito: ${grupo.cliente}`)).reduce((acc, f) => acc + Number(f.monto), 0) || 0;
                        const saldoPendienteBJ = grupo.total - abonoReal;

                        return (
                            <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '35px', border: '1px solid #FEF3C7', boxShadow: '0 10px 25px rgba(202, 138, 4, 0.05)' }}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <div>
                                        <strong style={{fontSize: '1.2rem'}}>{grupo.cliente}</strong>
                                        <br/><small style={{color: '#92400E'}}>📍 {grupo.localidad}</small>
                                    </div>
                                    <button 
                                        onClick={() => handleAnularCreditoBJ(grupo)} 
                                        style={{ border:'none', background:`${ROJO_BJ}15`, color:ROJO_BJ, padding:'10px', borderRadius:'12px', cursor:'pointer', fontWeight:'900', fontSize:'11px' }}
                                    >
                                        🗑️ ANULAR
                                    </button>
                                </div>

                                {/* DETALLE DE PRODUCTOS EN LA DEUDA */}
                                <div style={{ background: 'rgba(255, 255, 255, 0.6)', padding: '15px', borderRadius: '18px', margin: '15px 0', border: '1px dashed #FEF3C7' }}>
                                    <small style={{ fontWeight: '900', color: AMARILLO_BJ, textTransform: 'uppercase', fontSize: '10px' }}>Productos pendientes:</small>
                                    {grupo.items?.map((it, i) => (
                                        <div key={i} style={{ fontSize: '13px', marginTop: '5px' }}>• <strong>{it.cantidad}x</strong> {it.nombre} <small>({it.color})</small></div>
                                    ))}
                                </div>

                                <div style={{ background: '#fff', padding: '15px', borderRadius: '20px', margin: '15px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px' }}><span>Total Venta:</span><strong>S/ {grupo.total.toFixed(2)}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px', color: VERDE_BJ }}><span>Abono hoy:</span><strong>S/ {abonoReal.toFixed(2)}</strong></div>
                                    <hr style={{ border:'0.5px solid #eee', margin:'10px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: ROJO_BJ, fontSize: '1.2rem', fontWeight:'900' }}><span>RESTA PAGAR:</span><span>S/ {saldoPendienteBJ.toFixed(2)}</span></div>
                                </div>

                                <button onClick={() => handleCobrarDeudaBJ(grupo, saldoPendienteBJ)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 COBRAR SALDO</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}