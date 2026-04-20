"use client";
import React from 'react'; // Importación base ultra-estable
import { supabase } from '../supabaseClient'; 
import { getFechaPeru, getHoraPeru, formatForInputDT, handleInputMonto } from '../lib/helpers';

export default function GestionSection({
    balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas,
    idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza,
    handleUpdateFinanzaBJ, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // Usamos React.useState para evitar el error de "Referencia no definida"
    const [verAuditoria, setVerAuditoria] = React.useState(false);
    const [logs, setLogs] = React.useState([]);

    // Usamos React.useEffect para máxima compatibilidad
    React.useEffect(() => {
        if (verAuditoria) {
            const fetchLogs = async () => {
                const { data } = await supabase
                    .from('auditoria_bj')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(30);
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
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'600'}}>
                        <span style={{color: VERDE_BJ}}>Utilidad: S/ {balanceEliteBJ?.pe_g?.toFixed(2) || "0.00"}</span>
                        <span style={{color: ROJO_BJ}}>Meta: S/ {balanceEliteBJ?.pe_m?.toFixed(2) || "0.00"}</span>
                    </div>
                </div>

                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ?.bR?.toFixed(2) || "0.00"}</h3>
                    <small style={{opacity:0.6}}>Utilidad neta disponible.</small>
                </div>
            </div>

            {/* --- BLOQUE 2: VALORIZACIÓN DE CAPITAL --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...styleCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN MERCADERÍA</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.cost?.toLocaleString('es-PE') || "0"}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA ACTUAL FÍSICA</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ?.cG?.toFixed(2) || "0.00"}</h4>
                    <small style={{opacity:0.5}}>Dinero real en efectivo.</small>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>VALOR VENTA TOTAL</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.vent?.toLocaleString('es-PE') || "0"}</h4>
                </div>
            </div>

            {/* --- BLOQUE 3: LIBRO DIARIO --- */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Editable</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1', color:'#64748B' }}>
                                <th style={{ textAlign: 'left', padding: '15px' }}>FECHA</th>
                                <th style={{ textAlign: 'left', padding: '15px' }}>TIPO / BOLSA</th>
                                <th style={{ textAlign: 'right', padding: '15px' }}>MONTO</th>
                                <th style={{ textAlign: 'center', padding: '15px' }}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                {idEditFinanza === f.id ? (
                                    <>
                                        <td style={{ padding: '10px' }}><input type="datetime-local" value={formEditFinanza.created_at} onChange={e => setFormEditFinanza({...formEditFinanza, created_at: e.target.value})} style={{...styleInp, padding:'8px'}} /></td>
                                        <td style={{ padding: '10px' }}>
                                            <select value={formEditFinanza.tipo} onChange={e => setFormEditFinanza({...formEditFinanza, tipo: e.target.value})} style={{...styleInp, padding:'8px'}}>
                                                <option value="Gasto Local">🏪 Gasto Local</option>
                                                <option value="Retiro Personal">🏧 Retiro Personal</option>
                                                <option value="Ingreso Adicional">💰 Ingreso</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '10px' }}><input value={formEditFinanza.monto} onChange={e => setFormEditFinanza({...formEditFinanza, monto: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px', textAlign:'right'}} /></td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => handleUpdateFinanzaBJ(f.id)} style={{ background: VERDE_BJ, color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer' }}>OK</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '20px 15px' }}><small>{getFechaPeru(f.created_at)}</small><br/><strong>{getHoraPeru(f.created_at)}</strong></td>
                                        <td style={{ padding: '20px 15px' }}><small>{f.tipo}</small><br/><span style={{fontSize:'10px', fontWeight:'900'}}>{f.origen}</span></td>
                                        <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}><button onClick={() => { setIdEditFinanza(f.id); setFormEditFinanza({...f, created_at: formatForInputDT(f.created_at)}); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize:'18px' }}>✏️</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- BLOQUE 4: REGISTRO DE AUDITORÍA (OCULTO) --- */}
            <div 
                onClick={() => setVerAuditoria(!verAuditoria)} 
                style={{ textAlign:'center', opacity: 0.05, cursor:'pointer', fontSize:'9px', marginTop:'50px' }}
            >
                AUDITORÍA DE CAJA NEGRA BJ v1.2
            </div>

            {verAuditoria && (
                <div style={{ ...styleCrd, border: `2px solid ${ROJO_BJ}`, marginTop: '20px' }}>
                    <h3 style={{ color: ROJO_BJ, marginTop: 0 }}>🛡️ Bitácora de Seguridad</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>HORA</th>
                                    <th style={{ padding: '10px' }}>CLIENTE</th>
                                    <th style={{ padding: '10px' }}>MOVIMIENTO</th>
                                    <th style={{ padding: '10px' }}>MONTO</th>
                                    <th style={{ padding: '10px' }}>CAJA ANTES</th>
                                    <th style={{ padding: '10px' }}>CAJA POST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>{getHoraPeru(l.created_at)}</td>
                                        <td style={{ padding: '10px' }}>{l.cliente}</td>
                                        <td style={{ padding: '10px' }}>{l.operacion}</td>
                                        <td style={{ padding: '10px', color: VERDE_BJ, fontWeight: '900' }}>+ S/ {l.monto_operacion}</td>
                                        <td style={{ padding: '10px' }}>S/ {Number(l.caja_antes || 0).toFixed(2)}</td>
                                        <td style={{ padding: '10px', fontWeight: '900' }}>S/ {Number(l.caja_despues || 0).toFixed(2)}</td>
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