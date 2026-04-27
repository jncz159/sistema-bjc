"use client";
/**
 * ============================================================================
 * COMPONENTE: Almacen.js (v106.5 - EDICIÓN TOTAL)
 * ESTADO: FULL CRUD (Nombre, Costo, Stock, Mayor, Menor)
 * ============================================================================
 */
import React, { useState } from 'react';
import { handleInputMonto } from '../lib/helpers';

export default function AlmacenSection({
    formProd, setFormProd, handleAddProductoBJ, historialVentasDiaBJ,
    busquedaStock, setBusquedaStock, productos,
    idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto,
    handleUpdateProductoBJ, handleDeleteProductoBJ,
    formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // --- 📍 PEGAR AQUÍ LOS ESTADOS ---
   

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            {/* CABECERA */}
            <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', textAlign: 'center' }}>
            

<h2 style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', margin: 0, fontSize: '2rem' }}>📦Almacén Chiclayo</h2>


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
                {/* --- MODIFICAR AQUÍ: Inicio del Cajón de Stock --- */}
{/* --- CAJÓN DE STOCK CORREGIDO --- */}
<div style={{ 
    ...styleCrd, 
    maxHeight: '500px', 
    overflowY: 'auto', 
    backgroundColor: '#F8FAFC',
    border: `1px solid ${OSCURO_BJ}10`,
    padding: '15px'
}}>
    {/* La rejilla envuelve a los productos */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
        {productos.filter(p => (p?.nombre || '').toLowerCase().includes((busquedaStock || '').toLowerCase())).map(p => (
            <div key={p.id} style={{ border: '1px solid #F1F5F9', padding: '25px', borderRadius: '30px', backgroundColor: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
                
                {idEditProducto === p.id ? (
                    /* MODO EDICIÓN */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <small style={{ fontWeight:'900', color:FUCSIA_PRINCIPAL }}>EDITANDO:</small>
                        <input value={formEditProducto.nombre} onChange={e => setFormEditProducto({...formEditProducto, nombre: e.target.value})} style={styleInp} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleUpdateProductoBJ(p.id)} style={{ flex: 1, background: VERDE_BJ, color: '#fff', border:'none', padding:'12px', borderRadius:'12px', fontWeight:'900' }}>OK</button>
                            <button onClick={() => setIdEditProducto(null)} style={{ background: '#eee', border:'none', padding:'12px', borderRadius:'12px' }}>✕</button>
                        </div>
                    </div>
                ) : (
                    /* MODO VISTA */
                    <>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
                            <strong style={{ fontSize: '1.1rem', flex:1 }}>{p.nombre}</strong>
                            <div style={{ display:'flex', gap:'5px' }}>
                                <button onClick={() => { setIdEditProducto(p.id); setFormEditProducto({...p}); }} style={{ border:'none', background:`${FUCSIA_PRINCIPAL}10`, color:FUCSIA_PRINCIPAL, width:'35px', height:'35px', borderRadius:'10px' }}>✏️</button>
                                <button onClick={() => handleDeleteProductoBJ(p.id, p.nombre)} style={{ border:'none', background:`${ROJO_BJ}10`, color:ROJO_BJ, width:'35px', height:'35px', borderRadius:'10px' }}>🗑️</button>
                            </div>
                        </div>
                        
                        <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '15px', fontSize:'13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>STOCK:</span><strong>{p.stock} U.</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: FUCSIA_PRINCIPAL }}><span>MAYOR:</span><strong>S/ {Number(p.precio_venta).toFixed(2)}</strong></div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" placeholder="Cant." value={formEditStockBJ[p.id] || ''} onChange={(e) => setFormEditStockBJ({...formEditStockBJ, [p.id]: e.target.value})} style={{ ...styleInp, flex: 1 }} />
                            <button onClick={() => handleSincronizarStockBJ(p.id, formEditStockBJ[p.id])} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '0 15px', borderRadius: '15px', fontWeight: '900' }}>SYNC</button>
                        </div>
                    </>
                )}
            </div>
        ))}
    </div> {/* Cierre correcto de la rejilla */}
</div>
            </div>
        </div>
        {/* --- BLOQUE: HISTORIAL DE MOVIMIENTOS (Doble Box) --- */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', marginTop: '40px' }}>
    
    {/* BOX SALIDAS: Quién compró y horario */}
    <div style={{ ...styleCrd, borderTop: `5px solid ${ROJO_BJ}` }}>
        <h4 style={{ color: ROJO_BJ, marginTop: 0, fontWeight: '900' }}>📤 Salidas (Ventas en Tiempo Real)</h4>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {historialVentasDiaBJ?.length === 0 ? <p style={{opacity:0.5, fontSize:'12px'}}>No hay ventas hoy.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', opacity: 0.5 }}>
                            <th style={{ padding: '10px 5px' }}>CLIENTE / HORA</th>
                            <th>PRODUCTO</th>
                            <th>CANT.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historialVentasDiaBJ.map((v) => v.items.map((it, idx) => (
                            <tr key={`${v.id}-${idx}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '10px 5px' }}>
                                    <strong>{v.cliente_nombre}</strong><br/>
                                    <small>{v.hora}</small>
                                </td>
                                <td>{it.nombre}</td>
                                <td style={{ fontWeight: '900', color: ROJO_BJ }}>-{it.cantidad}</td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            )}
        </div>
    </div>

    {/* BOX ENTRADAS: Tus recargas de mercadería */}
    <div style={{ ...styleCrd, borderTop: `5px solid ${VERDE_BJ}` }}>
        <h4 style={{ color: VERDE_BJ, marginTop: 0, fontWeight: '900' }}>📥 Entradas (Recarga de Mercadería)</h4>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
             {/* Este box mostrará los datos de la tabla movimientos_stock_bj que crearemos */}
             <p style={{ opacity: 0.5, fontSize: '11px' }}>Registro de stock agregado manualmente hoy.</p>
             {/* Mapeo de entradas similar al de arriba */}
        </div>
    </div>
</div>
        </div>
    );
}