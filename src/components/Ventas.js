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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
            
            {showSuccess && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: VERDE_BJ, color: '#fff', padding: '15px 30px', borderRadius: '20px', fontWeight: '900', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 5000, animation: 'slideDown 0.5s ease-out' }}>
                    ✅ VENTA REGISTRADA
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>💵 CAJA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${VERDE_BJ}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>📈 GANANCIA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: VERDE_BJ }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '15px', gridColumn: 'span 2' }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px', display: 'block', marginBottom: '8px' }}>🏆 TOP 5</small>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                        {analiticaProBJ?.top?.map((t, i) => (
                            <div key={i} style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                <strong>{t[1]}u</strong> {t[0]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛍️ Catálogo</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '4px' }}>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#fff' : 'transparent' }}>MENOR</button>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? '#fff' : 'transparent' }}>MAYOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input list="clis-data" value={cliente} onChange={handleAutocompleteCliente} placeholder="Cliente" style={styleInp} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="Localidad" style={styleInp} />
                            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="999..." style={styleInp} />
                        </div>
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />

                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ padding: '15px', borderRadius: '22px', border: '1px solid #F1F5F9' }}>
                                    <strong style={{ fontSize: '14px' }}>{p.nombre}</strong><br/>
                                    <small style={{ color: VERDE_BJ, fontWeight: '900' }}>Stock: {p.stock}u | S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor}</small>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.6fr', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                        <select value={coloresElegidos[p.id] || 'Único'} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '5px' }}>
                                            {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                            <button onClick={() => modCant(p.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none' }}>-</button>
                                            <span style={{ fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => modCant(p.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none' }}>+</button>
                                        </div>
                                        <button onClick={() => setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: Number(cantidades[p.id] || 1), color: coloresElegidos[p.id] || 'Único', precio_venta: Number(tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor), precio_compra: p.precio_compra }])} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', height: '40px', borderRadius: '12px', fontWeight: '900' }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontWeight: '900' }}>🛒 Carrito</h3>
                    {carrito.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {carrito.map((item, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong style={{ fontSize: '13px' }}>{item.cantidad}x {item.nombre}</strong>
                                            <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: ROJO_BJ }}>✕</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                            <input type="number" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = Number(e.target.value); setCarrito(n); }} style={styleInp} />
                                            <input type="number" value={(item.precio_venta * item.cantidad).toFixed(2)} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = Number(e.target.value) / item.cantidad; setCarrito(n); }} style={{ ...styleInp, border: `1px solid ${VERDE_BJ}` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '900', fontSize: '12px' }}>EFECTIVO S/</span>
                                    <input type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} style={{ width: '100px', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', textAlign: 'right', fontWeight: '900', fontSize: '18px' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: '900' }}>
                                    <span>VUELTO: S/ {vuelto.toFixed(2)}</span>
                                    <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.4rem' }}>TOTAL: S/ {totalCarrito.toFixed(2)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={() => ejecutarVentaConAlerta('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900' }}>CASH 💵</button>
                                <button onClick={() => ejecutarVentaConAlerta('En Almacén')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900' }}>ALMACÉN 📦</button>
                                <button onClick={() => ejecutarVentaConAlerta('Pendiente de Pago')} style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900' }}>CRÉDITO 💳</button>
                                <button onClick={() => {}} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900' }}>WSP 📱</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={styleCrd}>
                <h3 style={{ margin: '0 0 20px 0', fontWeight: '900' }}>📖 Libro del Día</h3>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto', marginBottom: '20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {historialVentasDiaBJ.map((g, i) => (
                        <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '25px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', marginBottom: '10px' }}>
                                <span>{g.cliente_nombre} <small style={{ opacity: 0.5 }}>({g.hora})</small></span>
                                <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {g.total.toFixed(2)}</span>
                            </div>
                            {g.items.map((it, idx) => {
                                const pM = productos.find(p => p.id === it.producto_id);
                                const isEditing = idEditItemHistorial === it.id;
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #eee' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                                <input type="number" value={formEditItemHistorial.cantidad} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, cantidad: Number(e.target.value)})} style={{ width: '50px' }} />
                                                <input type="number" value={formEditItemHistorial.precio_venta_unitario} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, precio_venta_unitario: Number(e.target.value)})} style={{ width: '70px' }} />
                                                <button onClick={() => { handleUpdateItemVentaBJ(it.id, formEditItemHistorial); setIdEditItemHistorial(null); }}>💾</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span>{it.cantidad}x <strong>{pM?.nombre || "Item"}</strong> ({it.color})</span>
                                                <div>
                                                    <button onClick={() => { setIdEditItemHistorial(it.id); setFormEditItemHistorial({ cantidad: it.cantidad, precio_venta_unitario: it.precio_venta_unitario }); }} style={{ background: 'none', border: 'none' }}>✏️</button>
                                                    <button onClick={() => handleAnularVentaBJ(it)} style={{ background: 'none', border: 'none' }}>🗑️</button>
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