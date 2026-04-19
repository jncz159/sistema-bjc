"use client";
import React from 'react';

export default function LogisticaSection({
    logisticaInteligente, handleCobrarDeudaBJ, finanzas,
    FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, OSCURO_BJ, styleCrd
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={styleCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.almacen?.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', margin: '15px 0' }}>
                                {grupo.items?.map((it, i) => <div key={i} style={{ fontSize: '14px' }}>• {it.cantidad}x {it.nombre} ({it.color})</div>)}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo, 0)} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...styleCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Detalle de Abonos)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.deudas?.map((grupo, idx) => {
                        // Cálculo de abonos en tiempo real
                        const abonoReal = finanzas?.filter(f => f.descripcion.includes(`Abono inicial venta crédito: ${grupo.cliente}`)).reduce((acc, f) => acc + Number(f.monto), 0) || 0;
                        const saldoFaltante = grupo.total - abonoReal;

                        return (
                            <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border: '1px solid #FEF3C7' }}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', margin: '15px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px' }}><span>Venta Total:</span><strong>S/ {grupo.total.toFixed(2)}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px', color:VERDE_BJ }}><span>Abonado:</span><strong>S/ {abonoReal.toFixed(2)}</strong></div>
                                    <hr style={{ border:'0.5px solid #eee', margin:'10px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: ROJO_BJ, fontSize: '1.1rem' }}><span>PENDIENTE:</span><strong>S/ {saldoFaltante.toFixed(2)}</strong></div>
                                </div>
                                <button 
                                    onClick={() => handleCobrarDeudaBJ(grupo, saldoFaltante)} 
                                    style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}
                                >
                                    💰 COBRAR SALDO FINAL
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}