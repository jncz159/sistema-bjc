"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v2.5.0 - FULL RECOVERY & AUDITED)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * AUDITORÍA DE RESTAURACIÓN:
 * 1. Restaurado: Selector de Colores y Cantidades por producto.
 * 2. Restaurado: Toggle de Precio Mayor/Menor.
 * 3. Restaurado: Analítica de Top 5 Productos.
 * 4. Nuevo: Edición Dual (Precio/Subtotal) en Carrito.
 * 5. Nuevo: Fix de Nombres en el Libro mediante búsqueda cruzada.
 * ============================================================================
 */
import React, { useState } from 'react';

export default function VentasSection({
    balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull,
    tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas,
    localidad, setLocalidad, telefono, setTelefono,
    carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ,
    busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos,
    cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial,
    historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    const [efectivoRecibido, setEfectivoRecibido] = useState('');

    // --- LÓGICA DE EDICIÓN DUAL EN EL CARRITO ---
    const updatePrecioUnitario = (index, nuevoValor) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito[index].precio_venta = Number(nuevoValor);
        setCarrito(nuevoCarrito);
    };

    const updateSubtotal = (index, nuevoSubtotal) => {
        const nuevoCarrito = [...carrito];
        const item = nuevoCarrito[index];
        if (item.cantidad > 0) {
            item.precio_venta = Number(nuevoSubtotal) / item.cantidad;
        }
        setCarrito(nuevoCarrito);
    };

    const eliminarDelCarrito = (index) => {
        setCarrito(carrito.filter((_, i) => i !== index));
    };

    // --- CÁLCULO DE TOTALES ---
    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* --- BLOQUE 1: INDICADORES SUPERIORES --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>💵 CAJA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${VERDE_BJ}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>📈 GANANCIA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: VERDE_BJ }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
                {/* Analítica Top 5 Restaurada */}
                <div style={{ ...styleCrd, padding: '15px', gridColumn: 'span 2' }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px', display: 'block', marginBottom: '8px' }}>🏆 TOP 5 MÁS VENDIDOS</small>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {analiticaProBJ?.top?.map((t, i) => (
                            <div key={i} style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                <strong>{t[1]}u</strong> {t[0]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                
                {/* --- BLOQUE 2: CATÁLOGO DE PRODUCTOS (RESTAURADO) --- */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.2rem', fontWeight: '900' }}>🛍️ Punto de Venta</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '4px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Mayor' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Menor' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>MENOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Inputs de Cliente Restaurados con etiquetas */}
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>CLIENTE (Default: Tienda) *</label>
                            <input list="clis-data" value={cliente} onChange={handleAutocompleteCliente} style={{ ...styleInp, border: `2px solid ${cliente === 'Tienda' ? '#FCC2E2' : FUCSIA_PRINCIPAL}` }} />
                            <datalist id="clis-data">
                                {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                            </datalist>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>LOCALIDAD *</label>
                                <input value={localidad} onChange={e => setLocalidad(e.target.value)} style={styleInp} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>WHATSAPP</label>
                                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="999000XXX" style={styleInp} />
                            </div>
                        </div>

                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo en stock..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />

                        {/* Lista de productos con Color y Cantidad Restaurada */}
                        <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ padding: '15px', borderRadius: '20px', border: '1px solid #F1F5F9', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ fontSize: '15px', display: 'block' }}>{p.nombre}</strong>
                                            <small style={{ color: VERDE_BJ, fontWeight: '900' }}>STOCK: {p.stock}u | S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor}</small>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.6fr', gap: '10px', alignItems: 'center' }}>
                                        <select 
                                            value={coloresElegidos[p.id] || 'Único'} 
                                            onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})}
                                            style={{ ...styleInp, padding: '8px', fontSize: '12px' }}
                                        >
                                            {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                        </select>
                                        
                                        <input 
                                            type="number" 
                                            value={cantidades[p.id] || 1} 
                                            onChange={e => setCantidades({...cantidades, [p.id]: e.target.value})} 
                                            style={{ ...styleInp, padding: '8px', fontSize: '14px', textAlign: 'center' }} 
                                        />

                                        <button 
                                            onClick={() => setCarrito([...carrito, { 
                                                producto_id: p.id, 
                                                nombre: p.nombre, 
                                                cantidad: Number(cantidades[p.id] || 1), 
                                                color: coloresElegidos[p.id] || p.colores?.split(',')[0].trim() || 'Único', 
                                                precio_venta: Number(tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor), 
                                                precio_compra: p.precio_compra 
                                            }])}
                                            style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: CARRITO (EDICIÓN DUAL INTEGRADA) --- */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontSize: '1.2rem', fontWeight: '900' }}>🛒 Carrito</h3>
                    {carrito.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>Selecciona productos del catálogo</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {carrito.map((item, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '14px' }}>{item.cantidad}x {item.nombre}</strong><br/>
                                                <small style={{ opacity: 0.6 }}>Color: {item.color}</small>
                                            </div>
                                            <button onClick={() => eliminarDelCarrito(idx)} style={{ background: 'none', border: 'none', color: ROJO_BJ, cursor: 'pointer', fontWeight: '900', padding: '5px' }}>✕</button>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '4px' }}>P. UNITARIO (S/)</label>
                                                <input 
                                                    type="number"
                                                    value={item.precio_venta} 
                                                    onChange={(e) => updatePrecioUnitario(idx, e.target.value)} 
                                                    style={{ ...styleInp, padding: '10px', fontSize: '14px', textAlign: 'center', backgroundColor: '#fff' }} 
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '4px' }}>SUBTOTAL (S/)</label>
                                                <input 
                                                    type="number"
                                                    value={(item.precio_venta * item.cantidad).toFixed(2)} 
                                                    onChange={(e) => updateSubtotal(idx, e.target.value)} 
                                                    style={{ ...styleInp, padding: '10px', fontSize: '14px', textAlign: 'center', border: `2px solid ${VERDE_BJ}50`, backgroundColor: '#fff' }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Calculadora de Vuelto */}
                            <div style={{ marginTop: '10px', padding: '20px', borderRadius: '20px', backgroundColor: `${VERDE_BJ}10`, border: `2px dashed ${VERDE_BJ}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: '900', fontSize: '13px' }}>EFECTIVO RECIBIDO S/</span>
                                    <input 
                                        type="number" 
                                        value={efectivoRecibido} 
                                        onChange={e => setEfectivoRecibido(e.target.value)} 
                                        style={{ width: '100px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', fontWeight: '900', fontSize: '20px', outline: 'none', color: VERDE_BJ }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: VERDE_BJ, fontWeight: '900' }}>
                                    <span style={{ fontSize: '14px' }}>VUELTO A ENTREGAR:</span>
                                    <span style={{ fontSize: '1.4rem' }}>S/ {vuelto.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                                <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>TOTAL:</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</span>
                            </div>

                            <button 
                                onClick={() => handleEjecutarVentaBJ('Entregado')} 
                                style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', fontSize: '1.3rem', cursor: 'pointer', boxShadow: `0 10px 20px ${VERDE_BJ}30` }}
                            >
                                FINALIZAR VENTA 💵
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BLOQUE 4: LIBRO DE VENTAS (FIX DE NOMBRES INTEGRADO) --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.3rem' }}>📖 Libro del Día</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto', padding: '10px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}>EXPORTAR EXCEL</button>
                    </div>
                </div>

                <input 
                    value={busquedaHistorial} 
                    onChange={e => setBusquedaHistorial(e.target.value)} 
                    placeholder="🔍 Buscar cliente en el historial..." 
                    style={{ ...styleInp, marginBottom: '20px', border: '1px solid #E2E8F0' }} 
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {historialVentasDiaBJ.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>No hay ventas registradas para esta fecha.</div>
                    ) : (
                        historialVentasDiaBJ.map((g, i) => (
                            <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '25px', padding: '20px', backgroundColor: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderBottom: '2px solid #F8FAFC', paddingBottom: '12px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '16px' }}>{g.cliente_nombre}</span>
                                        <small style={{ fontWeight: 'normal', opacity: 0.5 }}>📍 {g.localidad} • 🕒 {g.hora}</small>
                                    </div>
                                    <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.2rem' }}>S/ {g.total.toFixed(2)}</span>
                                </div>
                                
                                {g.items.map((it, idx) => {
                                    // FIX DE NOMBRES: Búsqueda dinámica por ID en la lista maestra
                                    const pMaestro = productos.find(p => p.id === it.producto_id);
                                    const nombreFinal = pMaestro ? pMaestro.nombre : "Producto Eliminado";
                                    
                                    return (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0', borderBottom: '1px dashed #F1F5F9' }}>
                                            <span>{it.cantidad}x <strong>{nombreFinal}</strong> <small style={{ color: '#64748B' }}>({it.color})</small></span>
                                            <span style={{ fontWeight: '900' }}>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</span>
                                        </div>
                                    );
                                })}

                                <div style={{ textAlign: 'right', marginTop: '15px' }}>
                                    <button 
                                        onClick={() => handleAnularVentaBJ(g.items[0])} 
                                        style={{ backgroundColor: `${ROJO_BJ}10`, color: ROJO_BJ, border: 'none', padding: '8px 15px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        ANULAR COMPROBANTE
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}