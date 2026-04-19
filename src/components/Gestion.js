"use client";
import React from 'react';
import { getFechaPeru, getHoraPeru, formatForInputDT, handleInputMonto } from '../lib/helpers';

export default function GestionSection({
    balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas,
    idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza,
    handleUpdateFinanzaBJ, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px'}}>
                        <span>Utilidad: S/ {balanceEliteBJ?.pe_g?.toFixed(2) || "0.00"}</span>
                        <span>Meta: S/ {balanceEliteBJ?.pe_m?.toFixed(2) || "0.00"}</span>
                    </div>
                </div>

                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff' }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0}}>S/ {balanceEliteBJ?.bR?.toFixed(2) || "0.00"}</h3>
                </div>
            </div>

            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>⭐ Top 5 Más Vendidos</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                    {analiticaProBJ?.top?.map(([nombre, cantidad], idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '15px' }}>
                            <span>{idx + 1}. {nombre}</span>
                            <strong>{cantidad} U.</strong>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Editable</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1' }}>
                                <th style={{textAlign:'left', padding:'10px'}}>FECHA</th><th style={{textAlign:'left', padding:'10px'}}>TIPO</th><th style={{textAlign:'right', padding:'10px'}}>MONTO</th><th style={{textAlign:'center', padding:'10px'}}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                {idEditFinanza === f.id ? (
                                    <>
                                        <td><input type="datetime-local" value={formEditFinanza.created_at} onChange={e => setFormEditFinanza({...formEditFinanza, created_at: e.target.value})} style={styleInp} /></td>
                                        <td><input value={formEditFinanza.descripcion} onChange={e => setFormEditFinanza({...formEditFinanza, descripcion: e.target.value})} style={styleInp} /></td>
                                        <td><button onClick={() => handleUpdateFinanzaBJ(f.id)} style={{background: VERDE_BJ, color: '#fff', border:'none', padding:'5px 10px', borderRadius:'10px'}}>OK</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '15px' }}><small>{getFechaPeru(f.created_at)}</small></td>
                                        <td style={{ padding: '15px' }}>{f.tipo}</td>
                                        <td style={{ textAlign: 'right', padding: '15px' }}>S/ {f.monto?.toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}><button onClick={() => { setIdEditFinanza(f.id); setFormEditFinanza({...f, created_at: formatForInputDT(f.created_at)}); }} style={{ border: 'none', background: 'none' }}>✏️</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>💸 Nuevo Movimiento</h4>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                        <option value="Gasto Local">🏪 Gasto Local</option>
                        <option value="Inversión (Mercadería)">📦 Inversión</option>
                        <option value="Retiro Personal">🏧 Retiro Personal</option>
                        <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                    </select>
                    <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...styleInp, border:`2px solid ${AMARILLO_BJ}`}}>
                        <option value="Caja Global">Bolsa: Caja Global</option>
                        <option value="Ganancias">Bolsa: Ganancias</option>
                    </select>
                </div>
                <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={styleInp} />
                <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={styleInp} />
                <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900' }}>GUARDAR</button>
                </form>
            </div>
        </div>
    );
}