"use client";
/**
 * ============================================================================
 * COMPONENTE: Gestion.js (v2.1.1 SCROLL BOX + ESCUDO TOTAL)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * ACTUALIZACIÓN:
 * - Tabla de Libro Diario encapsulada con scroll vertical (max-height).
 * - Encabezados Sticky (fijos) para mejor navegación en celular.
 * - BLINDAJE: Agregados null-checks (?.) para evitar errores "undefined".
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import { getFechaPeru, getHoraPeru, formatForInputDT, handleInputMonto } from '../lib/helpers';

export default function GestionSection({
    balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas,
    idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza,
    handleUpdateFinanzaBJ, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    const [verAuditoria, setVerAuditoria] = useState(false);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (verAuditoria) {
            const fetchLogs = async () => {
                const { data } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: false }).limit(50);
                if (data) setLogs(data);
            };
            fetchLogs();
        }
    }, [verAuditoria]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* --- BLOQUE 1: INDICADORES ESTRATÉGICOS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'18px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'900'}}>
                        <span style={{color: VERDE_BJ}}>Ganancia Venta: S/ {(balanceEliteBJ?.pe_g || 0).toFixed(2)}</span>
                        <span style={{color: ROJO_BJ}}>Gastos Local: S/ {(balanceEliteBJ?.pe_m || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                    // Para el título de la Bóveda:
<small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', opacity: 0.6, fontSize: '11px', letterSpacing: '1px' }}>💰 BÓVEDA (UTILIDAD HISTÓRICA)</small>

// Para el número grande 
<div style={{ color: OSCURO_BJ, fontSize: '2.5rem', fontWeight: '900' }}>
                    <small style={{opacity: 0.5, fontSize: '10px'}}>Acumulado histórico de márgenes de ganancia pura.</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>CAPITAL EN MERCADERÍA</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(valorizacionStockBJ?.cost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                </div>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>CAJA ACTUAL FÍSICA</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(balanceEliteBJ?.cG || 0).toFixed(2)}</h4>
                </div>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid ${VERDE_BJ}`, backgroundColor: `${VERDE_BJ}05` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px', color: VERDE_BJ}}>DINERO POTENCIAL A GANAR</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0', color: VERDE_BJ}}>S/ {(valorizacionStockBJ?.pot || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                </div>
            </div>

            {/* --- BLOQUE 2: FORMULARIO DE REGISTRO --- */}
            <div style={styleCrd}>
                <h3 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, fontSize:'1.2rem', fontWeight: '900' }}>🖋️ Registrar Movimiento (Afecta Caja Física)</h3>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>TIPO DE MOVIMIENTO</label>
                        <select value={formFinanzas?.tipo || 'Gasto Local'} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                            <option value="Gasto Local">📉 Gasto Operativo Local</option>
                            <option value="Retiro Personal">👤 Retiro Personal (Dueño)</option>
                            <option value="Ingreso Adicional">📈 Ingreso Adicional</option>
                            <option value="Inversión Inicial">💰 Inversión de Capital</option>
                            <option value="Compra Mercadería">📦 Compra de Mercadería</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>DESCRIPCIÓN</label>
                        <input value={formFinanzas?.descripcion || ''} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} placeholder="Ej: Pago de Luz" style={styleInp} />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>MONTO (S/)</label>
                        <input value={formFinanzas?.monto || ''} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} placeholder="0.00" style={styleInp} />
                    </div>

                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', width: '100%' }}>
                        GUARDAR REGISTRO
                    </button>
                </form>
            </div>

            {/* --- BLOQUE 3: HISTORIAL DEL LIBRO DIARIO (CAJA CON SCROLL) --- */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900', fontSize: '1.2rem' }}>📖 Libro Diario de Finanzas</h4>
                
                {/* Contenedor principal con altura máxima y scroll */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #E2E8F0', borderRadius: '15px' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', minWidth:'600px', position: 'relative' }}>
                        {/* Encabezado fijo (Sticky) */}
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <tr style={{ color:'#64748B' }}>
                                <th style={{textAlign:'left', padding:'15px', borderBottom: '2px solid #E2E8F0'}}>FECHA Y HORA</th>
                                <th style={{textAlign:'left', padding:'15px', borderBottom: '2px solid #E2E8F0'}}>MOVIMIENTO</th>
                                <th style={{textAlign:'right', padding:'15px', borderBottom: '2px solid #E2E8F0'}}>MONTO</th>
                                <th style={{textAlign:'center', padding:'15px', borderBottom: '2px solid #E2E8F0'}}>EDITAR</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.filter(f => f != null).length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>No hay movimientos registrados.</td></tr>
                        ) : (
                            finanzas?.filter(f => f != null).map(f => (
                                <tr key={f?.id || Math.random()} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                    {idEditFinanza === f?.id ? (
                                        <>
                                            <td style={{padding:'10px'}}><input type="datetime-local" value={formEditFinanza?.created_at || ''} onChange={e => setFormEditFinanza({...formEditFinanza, created_at: e.target.value})} style={{...styleInp, padding:'10px'}} /></td>
                                            <td style={{padding:'10px'}}><input value={formEditFinanza?.descripcion || ''} onChange={e => setFormEditFinanza({...formEditFinanza, descripcion: e.target.value})} style={{...styleInp, padding:'10px'}} /></td>
                                            <td style={{padding:'10px'}}><input value={formEditFinanza?.monto || ''} onChange={e => setFormEditFinanza({...formEditFinanza, monto: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'10px', textAlign:'right'}} /></td>
                                            <td style={{padding:'10px', textAlign:'center'}}><button onClick={() => handleUpdateFinanzaBJ(f?.id)} style={{background: VERDE_BJ, color: '#fff', border:'none', padding:'10px 15px', borderRadius:'10px', cursor: 'pointer', fontWeight: '900'}}>OK</button></td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: '20px 15px' }}>
                                                <small style={{ color: '#64748B' }}>{f?.created_at ? getFechaPeru(f.created_at) : ''}</small><br/>
                                                <strong>{f?.created_at ? getHoraPeru(f.created_at) : ''}</strong>
                                            </td>
                                            <td style={{ padding: '20px 15px' }}>
                                                <strong style={{ fontSize: '15px' }}>{f?.tipo || 'Sin Tipo'}</strong><br/>
                                                <small style={{ opacity: 0.6 }}>{f?.descripcion || ''}</small>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900', fontSize: '16px', color: ['Ingreso Adicional','Inversión Inicial'].includes(f?.tipo) ? VERDE_BJ : ROJO_BJ }}>
                                                {['Ingreso Adicional','Inversión Inicial'].includes(f?.tipo) ? "+" : "-"} S/ {Number(f?.monto || 0).toFixed(2)}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '20px 15px' }}>
                                                <button onClick={() => { setIdEditFinanza(f?.id); setFormEditFinanza({...f, created_at: f?.created_at ? formatForInputDT(f.created_at) : ''}); }} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', padding: '10px', cursor:'pointer', fontSize:'16px' }}>✏️</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- BLOQUE 4: AUDITORÍA DE CAJA NEGRA --- */}
            <div 
                onClick={() => setVerAuditoria(!verAuditoria)} 
                style={{ textAlign:'center', cursor:'pointer', fontSize:'12px', fontWeight: '900', marginTop:'20px', padding: '15px', border: `2px dashed ${OSCURO_BJ}`, borderRadius: '15px', opacity: 0.5, transition: '0.3s' }}
            >
                {verAuditoria ? "OCULTAR AUDITORÍA" : "🕵️ ABRIR AUDITORÍA DE CAJA NEGRA"}
            </div>
            
            {verAuditoria && (
                <div style={{ ...styleCrd, border: `3px solid ${ROJO_BJ}`, marginTop: '10px' }}>
                    <h3 style={{ color: ROJO_BJ, fontSize:'1.2rem', marginTop: 0 }}>🕵️ Bitácora Forense</h3>
                    <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '15px' }}>Registro inmutable de la Caja Física.</p>
                    
                    {/* Auditoría también con caja de scroll para consistencia */}
                    <div style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth:'650px', position: 'relative' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FEF2F2', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <tr style={{ color: ROJO_BJ }}>
                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: `1px solid ${ROJO_BJ}50` }}>FECHA / HORA</th>
                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: `1px solid ${ROJO_BJ}50` }}>OPERACIÓN / CLIENTE</th>
                                    <th style={{ padding: '15px', textAlign: 'right', borderBottom: `1px solid ${ROJO_BJ}50` }}>MONTO (S/)</th>
                                    <th style={{ padding: '15px', textAlign: 'right', borderBottom: `1px solid ${ROJO_BJ}50` }}>SALDO DESPUÉS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs?.filter(l => l != null).length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>No hay registros en auditoría.</td></tr>
                                ) : (
                                    logs?.filter(l => l != null).map(l => (
                                        <tr key={l?.id || Math.random()} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px 15px' }}><small>{l?.created_at ? getFechaPeru(l.created_at) : ''}</small><br/><strong>{l?.created_at ? getHoraPeru(l.created_at) : ''}</strong></td>
                                            <td style={{ padding: '12px 15px' }}><span style={{fontWeight: '900'}}>{l?.operacion || 'N/A'}</span><br/><small>{l?.cliente || 'N/A'}</small></td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight:'900', fontSize: '14px', color: (l?.monto_operacion || 0) > 0 ? VERDE_BJ : ROJO_BJ }}>{(l?.monto_operacion || 0) > 0 ? "+" : ""} {Number(l?.monto_operacion || 0).toFixed(2)}</td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight:'900', fontSize: '14px' }}>S/ {Number(l?.caja_despues || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}