"use client";
/**
 * ============================================================================
 * COMPONENTE: Gestion.js (FONDO ÚNICO)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * CORRECCIÓN: Eliminado "Origen" para evitar confusiones. Todo afecta la caja física.
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
                        <span style={{color: VERDE_BJ}}>Ganancia Venta: S/ {balanceEliteBJ?.pe_g?.toFixed(2)}</span>
                        <span style={{color: ROJO_BJ}}>Gastos Local: S/ {balanceEliteBJ?.pe_m?.toFixed(2)}</span>
                    </div>
                </div>
                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'10px'}}>💰 BÓVEDA (UTILIDAD HISTÓRICA)</h4>
                    <h3 style={{fontSize:'3rem', margin:0}}>S/ {balanceEliteBJ?.bR?.toFixed(2)}</h3>
                    <small style={{opacity: 0.5, fontSize: '10px'}}>Acumulado histórico de márgenes de ganancia pura.</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>CAPITAL EN MERCADERÍA</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.cost?.toLocaleString()}</h4>
                </div>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px'}}>CAJA ACTUAL FÍSICA</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {balanceEliteBJ?.cG?.toFixed(2)}</h4>
                </div>
                <div style={{ ...styleCrd, padding:'20px', borderLeft:`10px solid ${VERDE_BJ}`, backgroundColor: `${VERDE_BJ}05` }}>
                    <small style={{fontWeight:'900', opacity:0.6, fontSize:'11px', color: VERDE_BJ}}>DINERO POTENCIAL A GANAR</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0', color: VERDE_BJ}}>S/ {valorizacionStockBJ?.pot?.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
                </div>
            </div>

            {/* --- BLOQUE 2: FORMULARIO DE REGISTRO (SIN ORIGEN, TODO ES CAJA) --- */}
            <div style={styleCrd}>
                <h3 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, fontSize:'1.2rem', fontWeight: '900' }}>🖋️ Registrar Movimiento (Afecta Caja Física)</h3>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>TIPO DE MOVIMIENTO</label>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                            <option value="Gasto Local">📉 Gasto Operativo Local</option>
                            <option value="Retiro Personal">👤 Retiro Personal (Dueño)</option>
                            <option value="Ingreso Adicional">📈 Ingreso Adicional</option>
                            <option value="Inversión Inicial">💰 Inversión de Capital</option>
                            <option value="Compra Mercadería">📦 Compra de Mercadería</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>DESCRIPCIÓN</label>
                        <input value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} placeholder="Ej: Pago de Luz" style={styleInp} />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px', display: 'block' }}>MONTO (S/)</label>
                        <input value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} placeholder="0.00" style={styleInp} />
                    </div>

                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', width: '100%' }}>
                        GUARDAR REGISTRO
                    </button>
                </form>
            </div>

            {/* --- BLOQUE 3: HISTORIAL DEL LIBRO DIARIO --- */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900', fontSize: '1.2rem' }}>📖 Libro Diario de Finanzas</h4>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', minWidth:'600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1', color:'#64748B', backgroundColor: '#F8FAFC' }}>
                                <th style={{textAlign:'left', padding:'15px'}}>FECHA Y HORA</th>
                                <th style={{textAlign:'left', padding:'15px'}}>MOVIMIENTO</th>
                                <th style={{textAlign:'right', padding:'15px'}}>MONTO</th>
                                <th style={{textAlign:'center', padding:'15px'}}>EDITAR</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                {idEditFinanza === f.id ? (
                                    <>
                                        <td style={{padding:'10px'}}><input type="datetime-local" value={formEditFinanza.created_at} onChange={e => setFormEditFinanza({...formEditFinanza, created_at: e.target.value})} style={{...styleInp, padding:'10px'}} /></td>
                                        <td style={{padding:'10px'}}><input value={formEditFinanza.descripcion} onChange={e => setFormEditFinanza({...formEditFinanza, descripcion: e.target.value})} style={{...styleInp, padding:'10px'}} /></td>
                                        <td style={{padding:'10px'}}><input value={formEditFinanza.monto} onChange={e => setFormEditFinanza({...formEditFinanza, monto: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'10px', textAlign:'right'}} /></td>
                                        <td style={{padding:'10px', textAlign:'center'}}><button onClick={() => handleUpdateFinanzaBJ(f.id)} style={{background: VERDE_BJ, color: '#fff', border:'none', padding:'10px 15px', borderRadius:'10px', cursor: 'pointer', fontWeight: '900'}}>OK</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '20px 15px' }}>
                                            <small style={{ color: '#64748B' }}>{getFechaPeru(f.created_at)}</small><br/>
                                            <strong>{getHoraPeru(f.created_at)}</strong>
                                        </td>
                                        <td style={{ padding: '20px 15px' }}>
                                            <strong style={{ fontSize: '15px' }}>{f.tipo}</strong><br/>
                                            <small style={{ opacity: 0.6 }}>{f.descripcion}</small>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900', fontSize: '16px', color: ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo) ? VERDE_BJ : ROJO_BJ }}>
                                            {['Ingreso Adicional','Inversión Inicial'].includes(f.tipo) ? "+" : "-"} S/ {Number(f.monto).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '20px 15px' }}>
                                            <button onClick={() => { setIdEditFinanza(f.id); setFormEditFinanza({...f, created_at: formatForInputDT(f.created_at)}); }} style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', padding: '10px', cursor:'pointer', fontSize:'16px' }}>✏️</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- BLOQUE 4: AUDITORÍA DE CAJA NEGRA --- */}
            <div 
                onClick={() => setVerAuditoria(!verAuditoria)} 
                style={{ textAlign:'center', cursor:'pointer', fontSize:'12px', fontWeight: '900', marginTop:'40px', padding: '15px', border: `2px dashed ${OSCURO_BJ}`, borderRadius: '15px', opacity: 0.5, transition: '0.3s' }}
            >
                {verAuditoria ? "OCULTAR AUDITORÍA" : "🕵️ ABRIR AUDITORÍA DE CAJA NEGRA"}
            </div>
            
            {verAuditoria && (
                <div style={{ ...styleCrd, border: `3px solid ${ROJO_BJ}`, marginTop: '10px' }}>
                    <h3 style={{ color: ROJO_BJ, fontSize:'1.2rem', marginTop: 0 }}>🕵️ Bitácora Forense (Últimos Movimientos)</h3>
                    <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>Registro inmutable de entradas y salidas de la Caja Física.</p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth:'650px' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8', color: '#64748B' }}>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>FECHA / HORA</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>OPERACIÓN / CLIENTE</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>MONTO (S/)</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>SALDO DESPUÉS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px' }}><small>{getFechaPeru(l.created_at)}</small><br/><strong>{getHoraPeru(l.created_at)}</strong></td>
                                        <td style={{ padding: '15px' }}><span style={{fontWeight: '900'}}>{l.operacion}</span><br/><small>{l.cliente}</small></td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight:'900', fontSize: '14px', color: l.monto_operacion > 0 ? VERDE_BJ : ROJO_BJ }}>{l.monto_operacion > 0 ? "+" : ""} {l.monto_operacion.toFixed(2)}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight:'900', fontSize: '14px' }}>S/ {l.caja_despues.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}