"use client";
/**
 * ============================================================================
 * COMPONENTE: Gestion.js (v1.4.1 MASTER)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * FUNCIONALIDAD: Restaurado Formulario de Libro Diario (Ingresos/Egresos)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* --- BLOQUE 1: INDICADORES ESTRATÉGICOS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'900'}}>
                        <span style={{color: VERDE_BJ}}>Utilidad: S/ {balanceEliteBJ?.pe_g?.toFixed(2)}</span>
                        <span style={{color: ROJO_BJ}}>Gastos: S/ {balanceEliteBJ?.pe_m?.toFixed(2)}</span>
                    </div>
                </div>
                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA UTILIDAD NETA</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0}}>S/ {balanceEliteBJ?.bR?.toFixed(2)}</h3>
                </div>
            </div>

            {/* --- BLOQUE 2: VALORIZACIÓN DE CAPITAL --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...styleCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN MERCADERÍA</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.cost?.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA ACTUAL FÍSICA</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ?.cG?.toFixed(2)}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>VALOR VENTA TOTAL</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.vent?.toLocaleString('es-PE')}</h4>
                </div>
            </div>

            {/* --- BLOQUE 3: FORMULARIO DE REGISTRO (RESTAURADO) --- */}
            <div style={styleCrd}>
                <h3 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🖋️ Registrar Movimiento (Libro Diario)</h3>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>TIPO DE MOVIMIENTO</label>
                        <select 
                            value={formFinanzas.tipo} 
                            onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} 
                            style={styleInp}
                        >
                            <option value="Gasto Local">📉 Gasto Local (Luz, Alquiler, etc)</option>
                            <option value="Retiro Personal">👤 Retiro Personal</option>
                            <option value="Ingreso Adicional">📈 Ingreso Adicional</option>
                            <option value="Inversión Inicial">💰 Inversión de Capital</option>
                            <option value="Compra Mercadería">📦 Compra de Mercadería</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>DESCRIPCIÓN</label>
                        <input 
                            value={formFinanzas.descripcion} 
                            onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} 
                            placeholder="Ej: Pago de luz Marzo" 
                            style={styleInp} 
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>MONTO (S/)</label>
                        <input 
                            value={formFinanzas.monto} 
                            onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} 
                            placeholder="0.00" 
                            style={styleInp} 
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>ORIGEN DEL DINERO</label>
                        <select 
                            value={formFinanzas.origen} 
                            onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} 
                            style={styleInp}
                        >
                            <option value="Caja Global">Efectivo de Caja</option>
                            <option value="Ganancias">De Utilidades (Bóveda)</option>
                            <option value="Capital Externo">Inversión Externa</option>
                        </select>
                    </div>
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>
                        REGISTRAR MOVIMIENTO
                    </button>
                </form>
            </div>

            {/* --- BLOQUE 4: TABLA DE HISTORIAL ADMINISTRATIVO --- */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>📖 Historial de Movimientos</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1', color:'#64748B' }}>
                                <th style={{textAlign:'left', padding:'15px'}}>FECHA</th>
                                <th style={{textAlign:'left', padding:'15px'}}>DESCRIPCIÓN</th>
                                <th style={{textAlign:'right', padding:'15px'}}>MONTO</th>
                                <th style={{textAlign:'center', padding:'15px'}}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                {idEditFinanza === f.id ? (
                                    <>
                                        <td style={{padding:'10px'}}><input type="datetime-local" value={formEditFinanza.created_at} onChange={e => setFormEditFinanza({...formEditFinanza, created_at: e.target.value})} style={{...styleInp, padding:'8px'}} /></td>
                                        <td style={{padding:'10px'}}><input value={formEditFinanza.descripcion} onChange={e => setFormEditFinanza({...formEditFinanza, descripcion: e.target.value})} style={{...styleInp, padding:'8px'}} /></td>
                                        <td style={{padding:'10px'}}><input value={formEditFinanza.monto} onChange={e => setFormEditFinanza({...formEditFinanza, monto: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px', textAlign:'right'}} /></td>
                                        <td style={{padding:'10px', textAlign:'center'}}><button onClick={() => handleUpdateFinanzaBJ(f.id)} style={{background: VERDE_BJ, color: '#fff', border:'none', padding:'8px 15px', borderRadius:'10px'}}>OK</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '20px 15px' }}><small>{getFechaPeru(f.created_at)}</small><br/><strong>{getHoraPeru(f.created_at)}</strong></td>
                                        <td style={{ padding: '20px 15px' }}><strong>{f.tipo}</strong><br/><span style={{fontSize:'11px', opacity:0.6}}>{f.descripcion}</span></td>
                                        <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900', color: ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo) ? VERDE_BJ : ROJO_BJ }}>S/ {Number(f.monto).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}><button onClick={() => { setIdEditFinanza(f.id); setFormEditFinanza({...f, created_at: formatForInputDT(f.created_at)}); }} style={{ border: 'none', background: 'none', cursor:'pointer', fontSize:'18px' }}>✏️</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ACTIVADOR OCULTO DE AUDITORÍA */}
            <div onClick={() => setVerAuditoria(!verAuditoria)} style={{ textAlign:'center', opacity: 0.1, cursor:'pointer', fontSize:'10px', marginTop:'80px' }}>
                BUNKER BJ SECURITY v1.4.1
            </div>

            {verAuditoria && (
                <div style={{ ...styleCrd, border: `2px solid ${ROJO_BJ}` }}>
                    <h3 style={{ color: ROJO_BJ }}>🛡️ Auditoría de Caja Negra</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>HORA</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>OPERACIÓN</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>MONTO</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>ANTES</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>DESPUÉS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>{getHoraPeru(l.created_at)}</td>
                                        <td style={{ padding: '10px' }}>{l.operacion} ({l.cliente})</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: l.monto_operacion > 0 ? VERDE_BJ : ROJO_BJ, fontWeight: '900' }}>S/ {l.monto_operacion.toFixed(2)}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>S/ {l.caja_antes.toFixed(2)}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900' }}>S/ {l.caja_despues.toFixed(2)}</td>
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