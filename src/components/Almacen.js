"use client";
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
            <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem' }}>📦 Almacén Chiclayo</h2>
                <p style={{ opacity: 0.7 }}>Gestión de productos y precios.</p>
            </div>

            <div style={{ ...styleCrd, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
              <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>🆕 Registrar Nuevo Producto</h4>
              <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={styleInp} />
                    <input placeholder="Costo Compra S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={styleInp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                    <input placeholder="Precio Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...styleInp, border:`2px solid ${FUCSIA_PRINCIPAL}`}} />
                    <input placeholder="Precio Menor" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...styleInp, border:`2px solid ${OSCURO_BJ}`}} />
                    <input placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={styleInp} />
                </div>
                <input placeholder="Colores" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={styleInp} />
                <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
              </form>
            </div>

            <div style={styleCrd}>
              <input placeholder="🔍 Buscar modelo..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...styleInp, marginBottom: '30px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busquedaStock.toLowerCase())).map((p) => (
                    <div key={p.id} style={{ border: '1px solid #F1F5F9', padding: '25px', borderRadius: '30px', backgroundColor: '#fff' }}>
                        {idEditProducto === p.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <input value={formEditProducto.nombre} onChange={e => setFormEditProducto({...formEditProducto, nombre: e.target.value})} style={{...styleInp, padding:'10px'}} />
                                <input value={formEditProducto.precio_venta} onChange={e => setFormEditProducto({...formEditProducto, precio_venta: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'8px'}} />
                                <button onClick={() => handleUpdateProductoBJ(p.id)} style={{background: VERDE_BJ, color: '#fff', border:'none', borderRadius:'10px', fontWeight:'900'}}>OK</button>
                            </div>
                        ) : (
                            <>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                    <strong style={{ fontSize: '1.1rem' }}>{p.nombre}</strong>
                                    <div>
                                        <button onClick={() => { setIdEditProducto(p.id); setFormEditProducto({...p}); }} style={{border:'none', background:'none', cursor:'pointer'}}>✏️</button>
                                        <button onClick={() => handleDeleteProductoBJ(p.id, p.nombre)} style={{border:'none', background:'none', cursor:'pointer'}}>🗑️</button>
                                    </div>
                                </div>
                                <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '15px', fontSize:'13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>STOCK:</span><strong>{p.stock} U.</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MAYOR:</span><strong>S/ {Number(p.precio_venta).toFixed(2)}</strong></div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="number" placeholder="Nuevo" value={formEditStockBJ[p.id] || ''} onChange={(e) => setFormEditStockBJ({...formEditStockBJ, [p.id]: e.target.value})} style={{ ...styleInp, padding: '10px', flex: 1 }} />
                                    <button onClick={() => handleSincronizarStockBJ(p.id, formEditStockBJ[p.id])} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '0 15px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>SYNC</button>
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