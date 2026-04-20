"use client";
/**
 * ============================================================================
 * COMPONENTE: Gestion.js (v1.4.6 MASTER)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * CORRECCIÓN: Restaurado bloque completo de Auditoría de Caja Negra.
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
    const [cargandoLogs, setCargandoLogs] = useState(false);

    // Cargar logs de auditoría cuando se abre la pestaña
    useEffect(() => {
        if (verAuditoria) {
            const fetchLogs = async () => {
                setCargandoLogs(true);
                const { data, error } = await supabase
                    .from('auditoria_bj')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (error) console.error("Error cargando auditoría:", error);
                if (data) setLogs(data);
                setCargandoLogs(false);
            };
            fetchLogs();
        }
    }, [verAuditoria]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* BLOQUE 1: INDICADORES PRINCIPALES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ?.pe_p || 0}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'900'}}>
                        <span style={{color: VERDE_BJ}}>Margen Real: S/ {balanceEliteBJ?.pe_g?.toFixed(2)}</span>
                        <span style={{color: ROJO_BJ}}>Gastos: S/ {balanceEliteBJ?.pe_m?.toFixed(2)}</span>
                    </div>
                </div>
                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO (UTILIDAD)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0}}>S/ {balanceEliteBJ?.bR?.toFixed(2)}</h3>
                    <small style={{opacity:0.5, fontSize:'10px'}}>Dinero ganado neto por ventas acumuladas.</small>
                </div>
            </div>

            {/* BLOQUE 2: VALORIZACIÓN DE CAPITAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...styleCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN MERCADERÍA (COSTO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.cost?.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA ACTUAL FÍSICA</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ?.cG?.toFixed(2)}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>VALOR VENTA TOTAL (STOCK)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStockBJ?.vent?.toLocaleString('es-PE')}</h4>
                </div>
            </div>

            {/* BLOQUE 3: REGISTRO DE MOVIMIENTOS ADMINISTRATIVOS */}
            <div style={styleCrd}>
                <h3 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🖋️ Registro de Libro Diario</h3>
                <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>TIPO DE GASTO/INGRESO</label>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                            <option value="Gasto Local">📉 Gasto Local</option>
                            <option value="Retiro Personal">👤 Retiro Personal</option>
                            <option value="Ingreso Adicional">📈 Ingreso Adicional</option>
                            <option value="Inversión Inicial">💰 Inversión Capital</option>
                            <option value="Compra Mercadería">📦 Compra Mercadería</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>DESCRIPCIÓN</label>
                        <input value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} placeholder="Ej: Pago Alquiler" style={styleInp} />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>MONTO (S/)</label>
                        <input value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} placeholder="0.00" style={styleInp} />
                    </div>
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>GUARDAR REGISTRO</button>
                </form>
            </div>

            {/* BLOQUE 4: TABLA DE FINANZAS */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>📖 Historial Administrativo</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f1f1', color:'#64748B' }}>
                                <th style={{textAlign:'left', padding:'15px'}}>FECHA</th>
                                <th style={{textAlign:'left', padding:'15px'}}>MOVIMIENTO</th>
                                <th style={{textAlign:'right', padding:'15px'}}>MONTO</th>
                                <th style={{textAlign:'center', padding:'15px'}}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas?.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                <td style={{ padding: '20px 15px' }}><small>{getFechaPeru(f.created_at)}</small><br/><strong>{getHoraPeru(f.created_at)}</strong></td>
                                <td style={{ padding: '20px 15px' }}><strong>{f.tipo}</strong><br/><span style={{fontSize:'11px', opacity:0.6}}>{f.descripcion}</span></td>
                                <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900', color: ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo) ? VERDE_BJ : ROJO_BJ }}>S/ {Number(f.monto).toFixed(2)}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => { setIdEditFinanza(f.id); setFormEditFinanza({...f, created_at: formatForInputDT(f.created_at)}); }} style={{ border: 'none', background: 'none', cursor:'pointer', fontSize:'18px' }}>✏️</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BLOQUE 5: ACTIVADOR DE AUDITORÍA (ESTO SE HABÍA CORTADO) */}
            <div 
                onClick={() => setVerAuditoria(!verAuditoria)} 
                style={{ textAlign:'center', opacity: 0.1, cursor:'pointer', fontSize:'10px', marginTop:'80px', padding:'20px', border:'1px dashed #ccc', borderRadius:'10px' }}
            >
                {verAuditoria ? "🔼 CERRAR AUDITORÍA" : "🛡️ ABRIR AUDITORÍA CAJA NEGRA v1.4.6"}
            </div>

            {verAuditoria && (
                <div style={{ ...styleCrd, border: `2px solid ${ROJO_BJ}`, marginTop: '20px', animation: 'fadeIn 0.5s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: ROJO_BJ, margin: 0 }}>🕵️ Bitácora Forense (Últimos 50 Movimientos)</h3>
                        {cargandoLogs && <small>Actualizando...</small>}
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>FECHA / HORA</th>
                                    <th style={{ padding: '12px' }}>CONCEPTO</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>MONTO</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>CAJA ANTES</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>CAJA DESPUÉS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No hay registros en la auditoría.</td></tr>
                                ) : (
                                    logs.map(l => (
                                        <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px' }}><small>{getFechaPeru(l.created_at)}</small><br/><strong>{getHoraPeru(l.created_at)}</strong></td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ fontWeight: '900', color: OSCURO_BJ }}>{l.operacion}</span>
                                                <br/><small style={{ color: '#64748B' }}>Ref: {l.cliente}</small>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: l.monto_operacion > 0 ? VERDE_BJ : ROJO_BJ }}>
                                                {l.monto_operacion > 0 ? "+" : ""} S/ {l.monto_operacion.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#94A3B8' }}>S/ {l.caja_antes.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: OSCURO_BJ }}>S/ {l.caja_despues.toFixed(2)}</td>
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