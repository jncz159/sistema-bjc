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
    formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ, movimientosStock,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // --- 📍 PEGAR AQUÍ LOS ESTADOS ---
   const [filtroSalida, setFiltroSalida] = useState('');

    // Lógica para filtrar las salidas por cliente o por producto
    const salidasFiltradas = historialVentasDiaBJ?.filter(v => {
        const busqueda = filtroSalida.toLowerCase();
        const coincideCliente = v.cliente_nombre?.toLowerCase().includes(busqueda);
        const coincideProducto = v.items.some(it => {
            const pInfo = productos.find(p => String(p.id) === String(it.producto_id));
            return pInfo?.nombre?.toLowerCase().includes(busqueda);
        });
        return coincideCliente || coincideProducto;
    }) || [];

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
                <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900', color: OSCURO_BJ }}>📦 Modelos en Inventario</h4>
                
                {/* 1. BUSCADOR INDEPENDIENTE (Ya no está dentro de un grid molesto) */}
                <input 
                    placeholder="🔍 Buscar modelo en stock..." 
                    value={busquedaStock} 
                    onChange={e => setBusquedaStock(e.target.value)} 
                    style={{ ...styleInp, marginBottom: '25px', border: `2px solid #E2E8F0` }} 
                />
                
                {/* 2. CAJÓN DE STOCK CON SCROLL (Limpio y sin anidación doble) */}
                <div style={{ 
                    maxHeight: '550px', 
                    overflowY: 'auto', 
                    backgroundColor: '#F8FAFC',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #E2E8F0'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {productos
                            .filter(p => (p?.nombre || '').toLowerCase().includes((busquedaStock || '').toLowerCase()))
                            .map(p => (
                            <div key={p.id} style={{ border: '1px solid #E2E8F0', padding: '20px', borderRadius: '25px', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                               {idEditProducto === p.id ? (
                                    /* --- MODO EDICIÓN FULL (Nombre, Precios y Stock) --- */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <small style={{ fontWeight:'900', color:FUCSIA_PRINCIPAL }}>EDITANDO PRODUCTO:</small>
                                        
                                        <input placeholder="Nombre" value={formEditProducto.nombre} onChange={e => setFormEditProducto({...formEditProducto, nombre: e.target.value})} style={styleInp} />
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{fontSize:'9px', fontWeight:'900'}}>P. MAYOR</label>
                                                <input value={formEditProducto.precio_venta} onChange={e => setFormEditProducto({...formEditProducto, precio_venta: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'10px'}} />
                                            </div>
                                            <div>
                                                <label style={{fontSize:'9px', fontWeight:'900'}}>P. MENOR</label>
                                                <input value={formEditProducto.precio_menor} onChange={e => setFormEditProducto({...formEditProducto, precio_menor: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'10px'}} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{fontSize:'9px', fontWeight:'900'}}>P. COSTO</label>
                                                <input value={formEditProducto.precio_compra} onChange={e => setFormEditProducto({...formEditProducto, precio_compra: handleInputMonto(e.target.value)})} style={{...styleInp, padding:'10px'}} />
                                            </div>
                                            <div>
                                                <label style={{fontSize:'9px', fontWeight:'900'}}>STOCK</label>
                                                <input value={formEditProducto.stock} onChange={e => setFormEditProducto({...formEditProducto, stock: e.target.value})} style={{...styleInp, padding:'10px'}} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                            <button onClick={() => handleUpdateProductoBJ(p.id)} style={{ flex: 1, background: VERDE_BJ, color: '#fff', border:'none', padding:'12px', borderRadius:'12px', fontWeight:'900' }}>GUARDAR ✅</button>
                                            <button onClick={() => setIdEditProducto(null)} style={{ background: '#eee', border:'none', padding:'12px', borderRadius:'12px' }}>✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                                            <strong style={{ fontSize: '1rem', flex:1 }}>{p.nombre}</strong>
                                            <div style={{ display:'flex', gap:'5px' }}>
                                                <button onClick={() => { setIdEditProducto(p.id); setFormEditProducto({...p}); }} style={{ border:'none', background:`${FUCSIA_PRINCIPAL}10`, color:FUCSIA_PRINCIPAL, width:'32px', height:'32px', borderRadius:'8px' }}>✏️</button>
                                                <button onClick={() => handleDeleteProductoBJ(p.id, p.nombre)} style={{ border:'none', background:`${ROJO_BJ}10`, color:ROJO_BJ, width:'32px', height:'32px', borderRadius:'8px' }}>🗑️</button>
                                            </div>
                                        </div>
                                        <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '15px', marginBottom: '12px', fontSize:'12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>STOCK:</span><strong>{p.stock} U.</strong></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: FUCSIA_PRINCIPAL }}><span>P. MAYOR:</span><strong>S/ {Number(p.precio_venta || 0).toFixed(2)}</strong></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="number" placeholder="Cant." value={formEditStockBJ[p.id] || ''} onChange={(e) => setFormEditStockBJ({...formEditStockBJ, [p.id]: e.target.value})} style={{ ...styleInp, flex: 1, padding: '10px' }} />
                                            <button onClick={() => handleSincronizarStockBJ(p.id, formEditStockBJ[p.id])} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '0 15px', borderRadius: '12px', fontWeight: '900', fontSize: '11px' }}>SYNC</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        {/* --- BLOQUE: HISTORIAL DE MOVIMIENTOS (Doble Box) --- */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', marginTop: '40px' }}>
    
  {/* BOX SALIDAS: Quién compró y horario */}
    <div style={{ ...styleCrd, borderTop: `5px solid ${ROJO_BJ}` }}>
        <h4 style={{ color: ROJO_BJ, marginTop: 0, fontWeight: '900' }}>📤 Salidas (Ventas Hoy)</h4>
        
        {/* BUSCADOR DE SALIDAS */}
        <input 
            placeholder="🔍 Filtrar por cliente o producto..." 
            value={filtroSalida}
            onChange={(e) => setFiltroSalida(e.target.value)}
            style={{ ...styleInp, marginBottom: '15px', padding: '10px', fontSize: '12px', border: '1px solid #eee', height: '40px' }}
        />

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {salidasFiltradas.length === 0 ? <p style={{opacity:0.5, fontSize:'12px'}}>No hay coincidencias.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', opacity: 0.5 }}>
                            <th style={{ padding: '10px 5px' }}>CLIENTE / HORA</th>
                            <th>PRODUCTO</th>
                            <th>CANT.</th>
                            <th style={{ textAlign: 'right' }}>STOCK ACT.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salidasFiltradas.map((v) => v.items.map((it, idx) => {
                            const pInfo = productos.find(p => String(p.id) === String(it.producto_id));
                            return (
                                <tr key={`${v.id_grupo}-${idx}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '10px 5px' }}>
                                        <strong>{v.cliente_nombre}</strong><br/><small>{v.hora}</small>
                                    </td>
                                    <td style={{ fontWeight: '600' }}>{pInfo ? pInfo.nombre : "Cargando..."}</td>
                                    <td style={{ fontWeight: '900', color: ROJO_BJ }}>-{it.cantidad}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '900' }}>{pInfo ? pInfo.stock : 0} U.</td>
                                </tr>
                            );
                        }))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
    {/* BOX ENTRADAS: Tus recargas de mercadería */}
    <div style={{ ...styleCrd, borderTop: `5px solid ${VERDE_BJ}` }}>
        <h4 style={{ color: VERDE_BJ, marginTop: 0, fontWeight: '900' }}>📥 Entradas (Recarga de Mercadería)</h4>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {!movimientosStock || movimientosStock.length === 0 ? (
                <p style={{ opacity: 0.5, fontSize: '11px' }}>No hay recargas registradas.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', opacity: 0.5 }}>
                            <th style={{ padding: '10px 5px' }}>PRODUCTO</th>
                            <th style={{ textAlign: 'center' }}>CANT.</th>
                            <th style={{ textAlign: 'right' }}>HORA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimientosStock.map((m, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '10px 5px', fontWeight: '700' }}>{m.producto_nombre}</td>
                                <td style={{ textAlign: 'center', color: VERDE_BJ, fontWeight: '900' }}>+{m.cantidad_agregada}</td>
                                <td style={{ textAlign: 'right', opacity: 0.6 }}>{new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
</div>
        </div>
    );
}