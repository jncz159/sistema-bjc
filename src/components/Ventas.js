"use client";
import React, { useState, useEffect } from 'react';

export default function VentasSection({
    balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull,
    tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas,
    localidad, setLocalidad, telefono, setTelefono,
    carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ,
    busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos,
    cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial,
    historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ, efectivoRecibido, setEfectivoRecibido,
    handleUpdateItemVentaBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    const [showSuccess, setShowSuccess] = useState(false); 
    const [idEditItemHistorial, setIdEditItemHistorial] = useState(null);
    const [formEditItemHistorial, setFormEditItemHistorial] = useState({});

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    const ejecutarVentaConAlerta = async (modo) => {
        await handleEjecutarVentaBJ(modo);
        setShowSuccess(true);
    };

    const modCant = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

    const totalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    const handleWhatsApp = () => {
        let msg = `*BJ IMPORTACIONES - PRESUPUESTO*%0A`;
        msg += `Cliente: ${cliente}%0A----------------------------%0A`;
        carrito.forEach(i => { msg += `• ${i.cantidad}x ${i.nombre} (${i.color}) - S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`; });
        msg += `----------------------------%0A*TOTAL: S/ ${totalCarrito.toFixed(2)}*%0A`;
        window.open(`https://wa.me/51${telefono}?text=${msg}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
            
            {showSuccess && (
                <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: VERDE_BJ, color: '#fff', padding: '18px 40px', borderRadius: '30px', fontWeight: '900', boxShadow: `0 15px 40px ${VERDE_BJ}50`, zIndex: 9999, animation: 'slideDown 0.4s ease-out', fontSize: '16px', letterSpacing: '1px' }}>
                    ✅ VENTA REGISTRADA
                </div>
            )}

            {/* --- BLOQUE 1: INDICADORES SUPERIORES --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, padding: '25px', textAlign: 'center', borderBottom: `6px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '12px', letterSpacing: '1px' }}>💵 CAJA FÍSICA HOY</small>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', marginTop: '5px' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '25px', textAlign: 'center', borderBottom: `6px solid ${VERDE_BJ}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '12px', letterSpacing: '1px' }}>📈 GANANCIA HOY</small>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', color: VERDE_BJ, marginTop: '5px' }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '20px', gridColumn: 'span 2' }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '12px', display: 'block', marginBottom: '12px', letterSpacing: '1px' }}>🏆 PRODUCTOS MÁS VENDIDOS</small>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                        {analiticaProBJ?.top?.map((t, i) => (
                            <div key={i} style={{ backgroundColor: '#F8FAFC', padding: '10px 18px', borderRadius: '15px', fontSize: '13px', whiteSpace: 'nowrap', border: '1px solid #E2E8F0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '15px' }}>{t[1]}u</strong> <span style={{ fontWeight: '600' }}>{t[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '30px' }}>
                
                {/* --- BLOQUE 2: CATÁLOGO --- */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '1.4rem' }}>🛍️ Catálogo BJ</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '15px', padding: '5px' }}>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Menor' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>MENOR</button>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Mayor' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>MAYOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '8px', display: 'block' }}>CLIENTE *</label>
                            <input list="clis-data" value={cliente} onChange={handleAutocompleteCliente} placeholder="Escribe el nombre del cliente" style={{ ...styleInp, border: `2px solid ${cliente === 'Tienda' ? '#FCC2E2' : FUCSIA_PRINCIPAL}` }} />
                            <datalist id="clis-data">
                                {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                            </datalist>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '8px', display: 'block' }}>LOCALIDAD *</label>
                                <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="Ej. Chiclayo" style={styleInp} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '8px', display: 'block' }}>WHATSAPP</label>
                                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="999 000 000" style={styleInp} />
                            </div>
                        </div>
                        
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo, foco, led..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}`, backgroundColor: '#F8FAFC' }} />

                        <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '5px', WebkitOverflowScrolling: 'touch' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ padding: '20px', borderRadius: '25px', border: '1px solid #F1F5F9', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <strong style={{ fontSize: '16px', lineHeight: '1.3' }}>{p.nombre}</strong>
                                    </div>
                                    <div style={{ marginTop: '5px', marginBottom: '15px' }}>
                                        <span style={{ color: VERDE_BJ, fontWeight: '900', backgroundColor: `${VERDE_BJ}10`, padding: '5px 10px', borderRadius: '8px', fontSize: '12px' }}>STOCK: {p.stock}u</span>
                                        <span style={{ fontWeight: '900', marginLeft: '10px', fontSize: '15px' }}>S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor}</span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.6fr', gap: '10px', alignItems: 'center' }}>
                                        <select value={coloresElegidos[p.id] || 'Único'} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '12px', fontSize: '13px', backgroundColor: '#F8FAFC' }}>
                                            {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: '15px', padding: '5px' }}>
                                            <button onClick={() => modCant(p.id, -1)} style={{ width: '35px', height: '35px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontWeight: '900', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>-</button>
                                            <span style={{ fontWeight: '900', fontSize: '16px', minWidth: '20px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => modCant(p.id, 1)} style={{ width: '35px', height: '35px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontWeight: '900', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>+</button>
                                        </div>
                                        <button onClick={() => setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: Number(cantidades[p.id] || 1), color: coloresElegidos[p.id] || p.colores?.split(',')[0].trim() || 'Único', precio_venta: Number(tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor), precio_compra: p.precio_compra }])} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', height: '45px', borderRadius: '15px', fontWeight: '900', fontSize: '20px', cursor: 'pointer', boxShadow: `0 5px 15px ${VERDE_BJ}40` }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: CARRITO MÁSTER --- */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontWeight: '900', fontSize: '1.4rem' }}>🛒 Carrito</h3>
                    {carrito.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8', border: '2px dashed #E2E8F0', borderRadius: '20px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
                            <strong>El carrito está vacío</strong><br/>Selecciona productos del catálogo.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                                {carrito.map((item, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '20px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                            <div>
                                                <strong style={{ fontSize: '15px' }}>{item.cantidad}x {item.nombre}</strong><br/>
                                                <small style={{ color: '#64748B', fontWeight: '600' }}>Color: {item.color}</small>
                                            </div>
                                            <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: ROJO_BJ, fontWeight: '900', fontSize: '16px', padding: '5px', cursor: 'pointer' }}>✕</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94A3B8', display: 'block', marginBottom: '5px' }}>UNITARIO (S/)</label>
                                                <input type="number" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = Number(e.target.value); setCarrito(n); }} style={{ ...styleInp, padding: '12px', textAlign: 'center', backgroundColor: '#fff' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: VERDE_BJ, display: 'block', marginBottom: '5px' }}>SUBTOTAL (S/)</label>
                                                <input type="number" value={(item.precio_venta * item.cantidad).toFixed(2)} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = Number(e.target.value) / item.cantidad; setCarrito(n); }} style={{ ...styleInp, padding: '12px', textAlign: 'center', border: `2px solid ${VERDE_BJ}50`, backgroundColor: '#fff' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '25px', borderRadius: '25px', border: `2px dashed ${VERDE_BJ}50` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '900', fontSize: '14px' }}>ABONO / EFECTIVO $</span>
                                        <small style={{ fontSize: '10px', opacity: 0.6 }}>(Llenar solo si es crédito)</small>
                                    </div>
                                    <input type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder="0.00" style={{ width: '120px', border: 'none', borderBottom: `3px solid ${VERDE_BJ}`, background: 'none', textAlign: 'right', fontWeight: '900', fontSize: '24px', outline: 'none', color: VERDE_BJ }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                                    <span style={{ fontWeight: '900', color: VERDE_BJ, fontSize: '16px' }}>VUELTO: S/ {vuelto.toFixed(2)}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', opacity: 0.5 }}>TOTAL A COBRAR</span><br/>
                                        <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '2.2rem', fontWeight: '900', lineHeight: '1' }}>S/ {totalCarrito.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <button onClick={() => ejecutarVentaConAlerta('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${VERDE_BJ}40`, transition: 'transform 0.1s' }}>VENTA CASH 💵</button>
                                <button onClick={() => ejecutarVentaConAlerta('En Almacén')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${AMARILLO_BJ}40` }}>ALMACÉN 📦</button>
                                <button onClick={() => ejecutarVentaConAlerta('Pendiente de Pago')} style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${ROJO_BJ}40` }}>A CRÉDITO 💳</button>
                                <button onClick={handleWhatsApp} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px #25D36640` }}>WHATSAPP 📱</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BLOQUE 4: LIBRO DEL DÍA FORENSE --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro del Día</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto', padding: '12px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>EXCEL</button>
                    </div>
                </div>

                <input value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} placeholder="🔍 Buscar cliente en historial..." style={{ ...styleInp, marginBottom: '25px', backgroundColor: '#F8FAFC' }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {historialVentasDiaBJ.map((g, i) => (
                        <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '30px', padding: '25px', backgroundColor: '#fff', boxShadow: '0 5px 20px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', marginBottom: '15px', borderBottom: '2px solid #F8FAFC', paddingBottom: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '16px' }}>{g.cliente_nombre}</span>
                                    <small style={{ fontWeight: 'normal', opacity: 0.5, marginTop: '4px' }}>📍 {g.localidad} • 🕒 {g.hora}</small>
                                </div>
                                <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.6rem' }}>S/ {g.total.toFixed(2)}</span>
                            </div>
                            
                            {g.items.map((it, idx) => {
                                const pM = productos.find(p => p.id === it.producto_id);
                                const isEditing = idEditItemHistorial === it.id;
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #F1F5F9' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                                                <input type="number" value={formEditItemHistorial.cantidad} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, cantidad: Number(e.target.value)})} style={{ ...styleInp, width: '60px', padding: '8px', textAlign: 'center' }} />
                                                <strong style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>{pM?.nombre}</strong>
                                                <input type="number" value={formEditItemHistorial.precio_venta_unitario} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, precio_venta_unitario: Number(e.target.value)})} style={{ ...styleInp, width: '90px', padding: '8px', textAlign: 'center' }} />
                                                <button onClick={() => { handleUpdateItemVentaBJ(it.id, formEditItemHistorial); setIdEditItemHistorial(null); }} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 15px', fontWeight: '900', cursor: 'pointer' }}>💾</button>
                                                <button onClick={() => setIdEditItemHistorial(null)} style={{ backgroundColor: '#E2E8F0', border: 'none', borderRadius: '10px', padding: '10px 15px', fontWeight: '900', cursor: 'pointer' }}>✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '14px' }}>{it.cantidad}x <strong>{pM?.nombre || "Ítem Eliminado"}</strong> <small style={{ color: '#94A3B8' }}>({it.color})</small></span>
                                                    <br/><small style={{ opacity: 0.5, fontSize: '11px' }}>Unidad: S/ {Number(it.precio_venta_unitario).toFixed(2)}</small>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <span style={{ fontWeight: '900', fontSize: '15px' }}>S/ {(Number(it.cantidad) * Number(it.precio_venta_unitario)).toFixed(2)}</span>
                                                    <div style={{ display: 'flex', gap: '15px' }}>
                                                        <button title="Editar Cantidad/Precio" onClick={() => { setIdEditItemHistorial(it.id); setFormEditItemHistorial({ cantidad: it.cantidad, precio_venta_unitario: it.precio_venta_unitario }); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✏️</button>
                                                        <button title="Devolver Ítem al Stock" onClick={() => handleAnularVentaBJ(it)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>🗑️</button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}