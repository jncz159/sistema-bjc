"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v2.7.0 - BUNKER EDITION)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * STATUS: AUDITADO - FULL FEATURES
 * * CAPACIDADES:
 * 1. Default: Precio por Menor activado.
 * 2. Arsenal: Botones de Venta Cash, Almacén, Crédito y WhatsApp.
 * 3. Táctico: Controles + / - de cantidad y selector de colores.
 * 4. Inteligencia: Edición Dual (Unitario/Subtotal) y Fix de Nombres.
 * 5. Control: Sistema de Anulación/Devolución con retorno de Stock y Caja.
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

    // --- LÓGICA DE CANTIDADES TÁCTICAS ---
    const modCant = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

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

    // --- WHATSAPP BUDGET (PRESUPUESTO) ---
    const handleEnviarWhatsAppPresupuesto = () => {
        let msg = `*BJ IMPORTACIONES - PRESUPUESTO*%0A`;
        msg += `Cliente: ${cliente}%0A----------------------------%0A`;
        carrito.forEach(i => {
            msg += `• ${i.cantidad}x ${i.nombre} (${i.color}) - S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`;
        });
        msg += `----------------------------%0A*TOTAL: S/ ${totalCarrito.toFixed(2)}*%0A`;
        window.open(`https://wa.me/51${telefono}?text=${msg}`, '_blank');
    };

    // --- CÁLCULOS DE CARRITO ---
    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* --- BLOQUE 1: INDICADORES Y ANALÍTICA --- */}
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
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px', display: 'block', marginBottom: '8px' }}>🏆 TOP 5 PRODUCTOS</small>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {analiticaProBJ?.top?.map((t, i) => (
                            <div key={i} style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'nowrap', border: '1px solid #E2E8F0' }}>
                                <strong>{t[1]}u</strong> {t[0]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                
                {/* --- BLOQUE 2: CATÁLOGO Y SELECCIÓN --- */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.1rem', fontWeight: '900' }}>🛍️ Punto de Venta</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '4px' }}>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Menor' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>MENOR</button>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? '#fff' : 'transparent', boxShadow: tipoVenta === 'Mayor' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>MAYOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

                        <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ padding: '15px', borderRadius: '22px', border: '1px solid #F1F5F9', backgroundColor: '#fff' }}>
                                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>{p.nombre}</strong>
                                    <small style={{ color: VERDE_BJ, fontWeight: '900' }}>Stock: {p.stock}u | S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor}</small>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.6fr', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                                        <select 
                                            value={coloresElegidos[p.id] || 'Único'} 
                                            onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})}
                                            style={{ ...styleInp, padding: '8px', fontSize: '11px' }}
                                        >
                                            {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                        </select>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                            <button onClick={() => modCant(p.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900', cursor: 'pointer' }}>-</button>
                                            <span style={{ fontWeight: '900', minWidth: '20px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => modCant(p.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900', cursor: 'pointer' }}>+</button>
                                        </div>

                                        <button 
                                            onClick={() => setCarrito([...carrito, { 
                                                producto_id: p.id, nombre: p.nombre, cantidad: Number(cantidades[p.id] || 1), 
                                                color: coloresElegidos[p.id] || p.colores?.split(',')[0].trim() || 'Único', 
                                                precio_venta: Number(tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor), 
                                                precio_compra: p.precio_compra 
                                            }])}
                                            style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', height: '40px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: CARRITO E INTELIGENCIA DE COBRO --- */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontSize: '1.2rem', fontWeight: '900' }}>🛒 Carrito Inteligente</h3>
                    {carrito.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>Selecciona productos del búnker</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '4px' }}>UNITARIO (S/)</label>
                                                <input type="number" value={item.precio_venta} onChange={(e) => updatePrecioUnitario(idx, e.target.value)} style={{ ...styleInp, padding: '10px', fontSize: '13px', textAlign: 'center' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '4px' }}>SUBTOTAL (S/)</label>
                                                <input type="number" value={(item.precio_venta * item.cantidad).toFixed(2)} onChange={(e) => updateSubtotal(idx, e.target.value)} style={{ ...styleInp, padding: '10px', fontSize: '13px', textAlign: 'center', border: `2px solid ${VERDE_BJ}50` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Calculadora de Vuelto */}
                            <div style={{ padding: '15px', borderRadius: '20px', backgroundColor: `${VERDE_BJ}10`, border: `2px dashed ${VERDE_BJ}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '900', fontSize: '12px' }}>EFECTIVO RECIBIDO S/</span>
                                    <input type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} style={{ width: '90px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', fontWeight: '900', fontSize: '18px', outline: 'none', color: VERDE_BJ }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: VERDE_BJ, fontWeight: '900', fontSize: '14px' }}>
                                    <span>VUELTO A ENTREGAR:</span>
                                    <span>S/ {vuelto.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <small style={{ fontWeight: '900', opacity: 0.5 }}>TOTAL A COBRAR</small>
                                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</div>
                            </div>

                            {/* --- ARSENAL DE BOTONES DE EJECUCIÓN --- */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}>VENTA CASH 💵</button>
                                <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}>ALMACÉN 📦</button>
                                <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}>A CRÉDITO 💳</button>
                                <button onClick={handleEnviarWhatsAppPresupuesto} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}>WHATSAPP 📱</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BLOQUE 4: LIBRO DE VENTAS (HISTORIAL & DEVOLUCIONES) --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.2rem' }}>📖 Libro del Día</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto', padding: '10px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '15px', fontWeight: '900', fontSize: '11px' }}>EXCEL</button>
                    </div>
                </div>

                <input value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} placeholder="🔍 Buscar cliente en historial..." style={{ ...styleInp, marginBottom: '20px' }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {historialVentasDiaBJ.map((g, i) => (
                        <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '25px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderBottom: '2px solid #F8FAFC', paddingBottom: '10px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{g.cliente_nombre}</span>
                                    <small style={{ fontWeight: 'normal', opacity: 0.5 }}>🕒 {g.hora} • 📍 {g.localidad}</small>
                                </div>
                                <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.2rem' }}>S/ {g.total.toFixed(2)}</span>
                            </div>
                            
                            {g.items.map((it, idx) => {
                                // FIX DE NOMBRES: Recupera nombre desde la lista maestra de productos
                                const pM = productos.find(p => p.id === it.producto_id);
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px dashed #F1F5F9' }}>
                                        <span>{it.cantidad}x <strong>{pM ? pM.nombre : "Producto"}</strong> <small>({it.color})</small></span>
                                        <span style={{ fontWeight: '900' }}>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</span>
                                    </div>
                                );
                            })}

                            <div style={{ textAlign: 'right', marginTop: '15px' }}>
                                <button 
                                    onClick={() => handleAnularVentaBJ(g.items[0])} 
                                    style={{ backgroundColor: `${ROJO_BJ}10`, color: ROJO_BJ, border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                >
                                    ⚠️ REALIZAR DEVOLUCIÓN / ANULAR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}