"use client";
import React, { useState } from 'react';
import { handleInputMonto } from '../lib/helpers';

export default function LogisticaSection({
    logisticaInteligente, handleCobrarDeudaBJ, handleAnularCreditoBJ,
    handleUpdateItemLogistica, handleEliminarItemIndividualLogistica,
    productos, finanzas,
    FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp
}) {
    const [editItemId, setEditItemId] = useState(null);
    const [formEdit, setFormEdit] = useState({});

    const startEdit = (it) => {
        setEditItemId(it.id);
        setFormEdit({
            producto_id: it.producto_id,
            cantidad: it.cantidad,
            color: it.color,
            precio_venta_unitario: it.subtotal / it.cantidad
        });
    };

    const renderItem = (it) => {
        const esEditando = editItemId === it.id;

        if (esEditando) {
            return (
                <div key={it.id} style={{ background: '#fff', padding: '10px', borderRadius: '15px', marginBottom: '8px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                    <select 
                        value={formEdit.producto_id} 
                        onChange={e => setFormEdit({...formEdit, producto_id: e.target.value})}
                        style={{...styleInp, padding:'5px', fontSize:'12px', marginBottom:'5px'}}
                    >
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'5px'}}>
                        <input type="number" value={formEdit.cantidad} onChange={e => setFormEdit({...formEdit, cantidad: e.target.value})} style={{...styleInp, padding:'5px'}} placeholder="Cant" />
                        <input value={formEdit.color} onChange={e => setFormEdit({...formEdit, color: e.target.value})} style={{...styleInp, padding:'5px'}} placeholder="Color" />
                        <button 
                            onClick={() => {
                                handleUpdateItemLogistica(it.id, formEdit, it.producto_id, it.cantidad);
                                setEditItemId(null);
                            }}
                            style={{background: VERDE_BJ, color:'#fff', border:'none', borderRadius:'8px', fontWeight:'900', cursor:'pointer'}}
                        >OK</button>
                    </div>
                    <button onClick={() => setEditItemId(null)} style={{width:'100%', marginTop:'5px', fontSize:'10px', background:'none', border:'none', color:'#64748B', cursor:'pointer'}}>Cancelar</button>
                </div>
            );
        }

        return (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '5px', alignItems:'center' }}>
                <span>• <strong>{it.cantidad}x</strong> {it.nombre} <small>({it.color})</small></span>
                <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => startEdit(it)} style={{border:'none', background:'none', cursor:'pointer', fontSize:'12px'}}>✏️</button>
                    <button onClick={() => handleEliminarItemIndividualLogistica(it)} style={{border:'none', background:'none', cursor:'pointer', fontSize:'12px'}}>🗑️</button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* ENTREGAS PENDIENTES */}
            <div style={styleCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.almacen?.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '35px', backgroundColor: '#fff' }}>
                            <div style={{marginBottom: '15px'}}>
                                <strong>{grupo.cliente}</strong><br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
                                {grupo.items?.map(it => renderItem(it))}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo, 0)} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* CUENTAS DEUDORAS */}
            <div style={{ ...styleCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Créditos)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente?.deudas?.map((grupo, idx) => {
                        const abonoReal = finanzas?.filter(f => f.descripcion?.includes(`Abono inicial venta crédito: ${grupo.cliente}`)).reduce((acc, f) => acc + Number(f.monto), 0) || 0;
                        const saldoPendienteBJ = grupo.total - abonoReal;

                        return (
                            <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '35px', border: '1px solid #FEF3C7' }}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <div><strong>{grupo.cliente}</strong><br/><small>📍 {grupo.localidad}</small></div>
                                    <button onClick={() => handleAnularCreditoBJ(grupo)} style={{ border:'none', background:`${ROJO_BJ}15`, color:ROJO_BJ, padding:'8px', borderRadius:'10px', cursor:'pointer', fontWeight:'900', fontSize:'11px' }}>ANULAR TODO</button>
                                </div>

                                <div style={{ background: 'rgba(255, 255, 255, 0.6)', padding: '15px', borderRadius: '18px', margin: '15px 0', border: '1px dashed #FEF3C7' }}>
                                    {grupo.items?.map(it => renderItem(it))}
                                </div>

                                <div style={{ background: '#fff', padding: '15px', borderRadius: '20px', margin: '15px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px' }}><span>Venta Total:</span><strong>S/ {grupo.total.toFixed(2)}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize:'13px', color: VERDE_BJ }}><span>Abono:</span><strong>S/ {abonoReal.toFixed(2)}</strong></div>
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