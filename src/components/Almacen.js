"use client";
/**
 * ============================================================================
 * COMPONENTE: Almacen.js (v106.5 - EDICIÓN TOTAL)
 * ESTADO: FULL CRUD (Nombre, Costo, Stock, Mayor, Menor)
 * ============================================================================
 */
import React from 'react';
import { handleInputMonto } from '../lib/helpers';

export default function AlmacenSection({
    formProd, setFormProd, handleAddProductoBJ,
    busquedaStock, setBusquedaStock, productos,
    idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto,
    handleUpdateProductoBJ, handleDeleteProductoBJ,
    formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            {/* CABECERA */}
            <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', textAlign: 'center' }}>
                // Para el título:
<h2 style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', margin: 0, fontSize: '2rem' }}>📦Almacén Chiclayo</h2>

// Para el subtítulo:
<p style={{ color: OSCURO_BJ, opacity: 0.6, margin: 0 }}>Control total de inventario y costos.</p>
            </div>

            {/* FORMULARIO: NUEVO PRODUCTO */}
            <div style={{ ...styleCrd, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
              <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>🆕 Registrar Nuevo Modelo</h4>
              <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                    <input placeholder="Nombre del Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={styleInp} />
                    <input placeholder="Costo Compra S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={styleInp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                    <input placeholder="Precio Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...styleInp, border:`2px solid ${FUCSIA_PRINCIPAL}`}} />
                    <input placeholder="Precio Menor" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...styleInp, border:`2px solid ${OSCURO_BJ}`}} />
                    <input placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={styleInp} />
                </div>
                <input placeholder="Colores (separados por coma: Rojo, Negro, Blanco...)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={styleInp} />
                <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR EN CATÁLOGO</button>
              </form>
            </div>

            {/* LISTADO Y EDICIÓN */}
            <div style={styleCrd}>
              <input placeholder="🔍 Buscar modelo en stock..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...styleInp, marginBottom: '30px', border:`2px solid ${OSCURO_BJ}20` }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                {productos.filter(p => (p?.nombre || '').toLowerCase().includes((busquedaStock || '').toLowerCase())).map(p => (
                    <div key={p.id} style={{ border: '1px solid #F1F5F9', padding: '25px', borderRadius: '30px', backgroundColor: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
                        
                        {idEditProducto === p.id ? (
                            /* MODO EDICIÓN FULL */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ marginBottom: '5px' }}>
                                    <small style={{ fontWeight:'900', color:FUCSIA_PRINCIPAL }}>EDITANDO MODELO:</small>
                                    <input value={formEditProducto.nombre} onChange={e => setFormEditProducto({...formEditProducto, nombre: e.target.value})} style={{...styleInp, padding:'10px', marginTop:'5px'}} />
                                </div>
                                
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                    <div>
                                        <small>Costo Compra:</small>
                                        <input value={formEditProducto.precio_compra} onChange={e => setFormEditProducto({...formEditProducto, precio_compra: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px'}} />
                                    </div>
                                    <div>
                                        <small>Stock:</small>
                                        <input type="number" value={formEditProducto.stock} onChange={e => setFormEditProducto({...formEditProducto, stock: e.target.value})} style={{...styleInp, padding:'8px'}} />
                                    </div>
                                </div>

                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                    <div>
                                        <small>P. Mayor:</small>
                                        <input value={formEditProducto.precio_venta} onChange={e => setFormEditProducto({...formEditProducto, precio_venta: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px', border:`1px solid ${FUCSIA_PRINCIPAL}`}} />
                                    </div>
                                    <div>
                                        <small>P. Menor:</small>
                                        <input value={formEditProducto.precio_menor} onChange={e => setFormEditProducto({...formEditProducto, precio_menor: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px', border:`1px solid ${OSCURO_BJ}`}} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button onClick={() => handleUpdateProductoBJ(p.id)} style={{ flex: 1, background: VERDE_BJ, color: '#fff', border:'none', padding:'12px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>GUARDAR</button>
                                    <button onClick={() => setIdEditProducto(null)} style={{ background: '#eee', color: '#666', border:'none', padding:'12px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>X</button>
                                </div>
                            </div>
                        ) : (
                            /* MODO VISTA */
                            <>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
                                    <strong style={{ fontSize: '1.1rem', flex:1 }}>{p.nombre}</strong>
                                    <div style={{ display:'flex', gap:'5px' }}>
                                        <button onClick={() => { setIdEditProducto(p.id); setFormEditProducto({...p}); }} style={{ border:'none', background:`${FUCSIA_PRINCIPAL}10`, color:FUCSIA_PRINCIPAL, width:'35px', height:'35px', borderRadius:'10px', cursor:'pointer' }}>✏️</button>
                                        <button onClick={() => handleDeleteProductoBJ(p.id, p.nombre)} style={{ border:'none', background:`${ROJO_BJ}10`, color:ROJO_BJ, width:'35px', height:'35px', borderRadius:'10px', cursor:'pointer' }}>🗑️</button>
                                    </div>
                                </div>
                                
                                <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '15px', fontSize:'13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'5px' }}><span>STOCK:</span><strong>{p.stock} U.</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'5px' }}><span>COSTO:</span><span style={{opacity:0.6}}>S/ {Number(p.precio_compra).toFixed(2)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: FUCSIA_PRINCIPAL }}><span>MAYOR:</span><strong>S/ {Number(p.precio_venta).toFixed(2)}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MENOR:</span><strong>S/ {Number(p.precio_menor || p.precio_venta).toFixed(2)}</strong></div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="number" placeholder="Sincronizar" value={formEditStockBJ[p.id] || ''} onChange={(e) => setFormEditStockBJ({...formEditStockBJ, [p.id]: e.target.value})} style={{ ...styleInp, padding: '10px', flex: 1, fontSize:'13px' }} />
                                    <button onClick={() => handleSincronizarStockBJ(p.id, formEditStockBJ[p.id])} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '0 15px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize:'12px' }}>SYNC</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
              </div>
            </div>
        </div>
    );
}