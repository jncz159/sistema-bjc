"use client";
import React from 'react';
import { getFechaPeru, getHoraPeru, formatForInputDT, handleInputMonto } from '../lib/helpers';

export default function GestionSection({
    balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas,
    idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza,
    handleUpdateFinanzaBJ, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // 1. PEGA ESTO AQUÍ (Justo al inicio)
    const [verAuditoria, setVerAuditoria] = useState(false);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (verAuditoria) {
            const fetchLogs = async () => {
                const { data } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: false }).limit(30);
                if (data) setLogs(data);
            };
            fetchLogs();
        }
    }, [verAuditoria]);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* FILA 1: PUNTO DE EQUILIBRIO Y BÓVEDA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'600'}}>
                        <span style={{color: VERDE_BJ}}>Utilidad Mes: S/ {balanceEliteBJ?.pe_g?.toFixed(2) || "0.00"}</span>
                        <span style={{color: ROJO_BJ}}>Meta (Gastos): S/ {balanceEliteBJ?.pe_m?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div style={{marginTop:'10px', fontSize:'11px', opacity:0.6}}>
                        {balanceEliteBJ?.pe_p < 100 ? `Faltan S/ ${(balanceEliteBJ?.pe_m - balanceEliteBJ?.pe_g).toFixed(2)} para cubrir gastos.` : '✅ Gastos cubiertos este mes.'}
                    </div>
                </div>

                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO (UTILIDAD DISPO)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ?.bR?.toFixed(2) || "0.00"}</h3>
                    <small style={{opacity:0.6, fontSize:'10px'}}>Utilidad neta acumulada menos retiros de bolsa "Ganancias".</small>
                </div>
            </div>

            {/* FILA 2: LAS 3 TARJETAS QUE FALTABAN (CAPITAL Y CAJA REAL) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...styleCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN MERCADERÍA (COSTO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.cost?.toLocaleString('es-PE') || "0.00"}</h4>
                    <small style={{opacity:0.5}}>Dinero invertido actualmente en stock.</small>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA ACTUAL FÍSICA (EFECTIVO EN MANO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ?.cG?.toFixed(2) || "0.00"}</h4>
                    <small style={{opacity:0.5}}>Efectivo real restando TODOS los gastos y retiros.</small>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>VALOR VENTA TOTAL (POTENCIAL)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.vent?.toLocaleString('es-PE') || "0.00"}</h4>
                    <small style={{opacity:0.5}}>Dinero que entraría si vendes todo al precio actual.</small>
                </div>
            </div>

            {/* TOP VENTAS */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>⭐ Modelos Top 5 Más Vendidos</h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                    {analiticaProBJ?.top?.map(([nombre, cantidad], idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 25px', backgroundColor: idx === 0 ? `${FUCSIA_PRINCIPAL}10` : '#F8FAFC', borderRadius: '15px', borderLeft: idx === 0 ? `5px solid ${FUCSIA_PRINCIPAL}` : 'none' }}>
                            <span style={{fontWeight:'900'}}>{idx + 1}. {nombre}</span>
                            <strong style={{color: FUCSIA_PRINCIPAL}}>{cantidad} Unidades</strong>
                        </div>
                    ))}
                    {(!analiticaProBJ?.top || analiticaProBJ.top.length === 0) && <p style={{opacity:0.5}}>Aún no hay datos de ventas.</p>}
                </div>
            </div>

            {/* LIBRO DIARIO */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Operaciones (Editable)</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1', color:'#64748B' }}>
                                <th style={{ textAlign: 'left', padding: '15px' }}>FECHA Y HORA</th>
                                <th style={{ textAlign: 'left', padding: '15px' }}>DETALLE / TIPO</th>
                                <th style={{ textAlign: 'left', padding: '15px' }}>BOLSA</th>
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
                                                <option value="Inversión (Mercadería)">📦 Inversión</option>
                                                <option value="Retiro Personal">🏧 Retiro Personal</option>
                                                <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <select value={formEditFinanza.origen} onChange={e => setFormEditFinanza({...formEditFinanza, origen: e.target.value})} style={{...styleInp, padding:'8px'}}>
                                                <option value="Caja Global">Caja Global</option>
                                                <option value="Ganancias">Ganancias</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '10px' }}><input value={formEditFinanza.monto} onChange={e => setFormEditFinanza({...formEditFinanza, monto: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px', textAlign:'right'}} /></td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            <button onClick={() => handleUpdateFinanzaBJ(f.id)} style={{ background: VERDE_BJ, color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>OK</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '20px 15px' }}><small>{getFechaPeru(f.created_at)}</small><br/><strong>{getHoraPeru(f.created_at)}</strong></td>
                                        <td style={{ padding: '20px 15px' }}><small>{f.tipo}</small><br/><span>{f.descripcion}</span></td>
                                        <td style={{ padding: '20px 15px' }}><span style={{fontWeight:'900', fontSize:'11px'}}>{f.origen?.toUpperCase()}</span></td>
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

            {/* REGISTRO DE MOVIMIENTO */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>💸 Nuevo Movimiento de Caja</h4>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                        <option value="Gasto Local">🏪 Gasto Local</option>
                        <option value="Inversión (Mercadería)">📦 Inversión</option>
                        <option value="Retiro Personal">🏧 Retiro Personal</option>
                        <option value="Ingreso Adicional">💰 Ingreso Adicional / Capital</option>
                    </select>
                    <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...styleInp, border:`2px solid ${AMARILLO_BJ}`}}>
                        <option value="Caja Global">Bolsa: Caja Global</option>
                        <option value="Ganancias">Bolsa: Ganancias</option>
                    </select>
                </div>
                <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={styleInp} />
                <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={styleInp} />
                <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                </form>
            </div>
        </div>
    );
}