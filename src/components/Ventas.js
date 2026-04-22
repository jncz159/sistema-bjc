"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v2.8.1 - BANNER FIX)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * STATUS: CORREGIDO - Banner de éxito vinculado a los botones.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';

export default function VentasSection({
    balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull,
    tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas,
    localidad, setLocalidad, telefono, setTelefono,
    carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ,
    busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos,
    cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial,
    historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ, efectivoRecibido, setEfectivoRecibido,
    handleUpdateItemVentaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // --- ESTADOS LOCALES ---
    const [showSuccess, setShowSuccess] = useState(false); 
    const [idEditItemHistorial, setIdEditItemHistorial] = useState(null);
    const [formEditItemHistorial, setFormEditItemHistorial] = useState({});

    // --- EFECTO PARA MOSTRAR ÉXITO ---
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    // Función envolvente para activar el banner
    const ejecutarVentaConAlerta = async (modo, abono = 0) => {
        await handleEjecutarVentaBJ(modo, abono);
        setShowSuccess(true); // <--- ESTO ACTIVA EL CARTEL
        setEfectivoRecibido('');
    };

    const modCant = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

    const updatePrecioUnitario = (idx, val) => {
        const nC = [...carrito]; nC[idx].precio_venta = Number(val); setCarrito(nC);
    };

    const updateSubtotal = (idx, val) => {
        const nC = [...carrito];
        const it = nC[idx];
        if (it.cantidad > 0) it.precio_venta = Number(val) / it.cantidad;
        setCarrito(nC);
    };

    const handleEnviarWhatsAppPresupuesto = () => {
        let msg = `*BJ IMPORTACIONES - PRESUPUESTO*%0A`;
        msg += `Cliente: ${cliente}%0A----------------------------%0A`;
        carrito.forEach(i => {
            msg += `• ${i.cantidad}x ${i.nombre} (${i.color}) - S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`;
        });
        msg += `----------------------------%0A*TOTAL: S/ ${totalCarrito.toFixed(2)}*%0A`;
        window.open(`https://wa.me/51${telefono}?text=${msg}`, '_blank');
    };

    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
            
            {/* --- BANNER DE CONFIRMACIÓN (UX) --- */}
            {showSuccess && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: VERDE_BJ, color: '#fff', padding: '15px 30px', borderRadius: '20px', fontWeight: '900', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 5000, display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideDown 0.5s ease-out' }}>
                    <span>✅ VENTA REGISTRADA CON ÉXITO</span>
                </div>
            )}

            {/* --- INDICADORES --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>💵 CAJA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '20px', textAlign: 'center', borderBottom: `5px solid ${VERDE_BJ}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px' }}>📈 GANANCIA HOY</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: VERDE_BJ }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                {/* --- CATÁLOGO --- */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.1rem', fontWeight: '900' }}>🛍️ Catálogo</h3>
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
                                <div key={p.id} style={{ padding: '12px', borderRadius: '15px', border: '1px solid #F1F5F9' }}>
                                    <strong>{p.nombre}</strong><br/>
                                    <small style={{ color: VERDE_BJ, fontWeight: '900' }}>Stock: {p.stock}u | S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor}</small>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.6fr', gap: '8px', marginTop: '10px' }}>
                                        <select value={coloresElegidos[p.id] || 'Único'} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '5px' }}>
                                            {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <button onClick={() => modCant(p.id, -1)} style={{ width: '25px', border: 'none', borderRadius: '5px' }}>-</button>
                                            <span>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => modCant(p.id, 1)} style={{ width: '25px', border: 'none', borderRadius: '5px' }}>+</button>
                                        </div>
                                        <button onClick={() => setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: Number(cantidades[p.id] || 1), color: coloresElegidos[p.id] || 'Único', precio_venta: Number(tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor), precio_compra: p.precio_compra }])} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', borderRadius: '8px' }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- CARRITO --- */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontSize: '1.2rem', fontWeight: '900' }}>🛒 Carrito</h3>
                    {carrito.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {carrito.map((item, idx) => (
                                <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{item.cantidad}x {item.nombre}</strong>
                                        <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: ROJO_BJ }}>✕</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                                        <input type="number" value={item.precio_venta} onChange={(e) => updatePrecioUnitario(idx, e.target.value)} style={styleInp} />
                                        <input type="number" value={(item.precio_venta * item.cantidad).toFixed(2)} onChange={(e) => updateSubtotal(idx, e.target.value)} style={{ ...styleInp, border: `1px solid ${VERDE_BJ}` }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>EFECTIVO S/</span>
                                    <input type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} style={{ width: '80px', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', textAlign: 'right' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: '900' }}>
                                    <span>TOTAL: S/ {totalCarrito.toFixed(2)}</span>
                                    <span>VUELTO: S/ {vuelto.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* --- AQUÍ ESTÁ LA CORRECCIÓN CRÍTICA --- */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={() => ejecutarVentaConAlerta('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>CASH 💵</button>
                                <button onClick={() => ejecutarVentaConAlerta('En Almacén')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>ALMACÉN 📦</button>
                                <button onClick={() => ejecutarVentaConAlerta('Pendiente de Pago', efectivoRecibido)} style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>CRÉDITO 💳</button>
                                <button onClick={handleEnviarWhatsAppPresupuesto} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>WSP 📱</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- LIBRO --- */}
            <div style={styleCrd}>
                <h3 style={{ marginTop: 0 }}>📖 Libro del Día</h3>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto', marginBottom: '20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {historialVentasDiaBJ.map((g, i) => (
                        <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '20px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                                <span>{g.cliente_nombre}</span>
                                <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {g.total.toFixed(2)}</span>
                            </div>
                            {g.items.map((it, idx) => {
                                const pM = productos.find(p => p.id === it.producto_id);
                                const isEditing = idEditItemHistorial === it.id;
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input type="number" value={formEditItemHistorial.cantidad} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, cantidad: Number(e.target.value)})} style={{ width: '40px' }} />
                                                <button onClick={() => { handleUpdateItemVentaBJ(it.id, formEditItemHistorial); setIdEditItemHistorial(null); }}>💾</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span>{it.cantidad}x {pM?.nombre || "Item"}</span>
                                                <div>
                                                    <button onClick={() => { setIdEditItemHistorial(it.id); setFormEditItemHistorial({ cantidad: it.cantidad, precio_venta_unitario: it.precio_venta_unitario }); }}>✏️</button>
                                                    <button onClick={() => handleAnularVentaBJ(it)}>🗑️</button>
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