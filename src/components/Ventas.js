"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v2.8.0 - FULL BUNKER EDITION)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * STATUS: AUDITADO - NO SIMPLIFICADO
 * * CAPACIDADES INTEGRADAS:
 * 1. Default: Precio por Menor.
 * 2. Arsenal: Cash, Almacén, Crédito, WhatsApp.
 * 3. Táctico: Controles +/- cantidad, Selector de colores, Top 5 Analítica.
 * 4. Inteligencia: Edición Dual en Carrito, Fix de Nombres en Historial.
 * 5. Seguridad: Edición y Eliminación INDIVIDUAL por ítem en el Libro.
 * 6. UX: Banner de confirmación de venta exitosa.
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
    historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ,
    handleUpdateItemVentaBJ, // Prop nueva para edición individual
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd
}) {
    // --- ESTADOS LOCALES ---
    const [efectivoRecibido, setEfectivoRecibido] = useState('');
    const [showSuccess, setShowSuccess] = useState(false); // Banner de éxito
    const [idEditItemHistorial, setIdEditItemHistorial] = useState(null);
    const [formEditItemHistorial, setFormEditItemHistorial] = useState({});

    // --- EFECTO PARA MOSTRAR ÉXITO ---
    // Detecta cuando el carrito se vacía tras una ejecución exitosa
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    const ejecutarVentaConAlerta = async (modo, abono = 0) => {
        await handleEjecutarVentaBJ(modo, abono);
        setShowSuccess(true);
        setEfectivoRecibido('');
    };

    // --- LÓGICA DE CANTIDADES TÁCTICAS ---
    const modCant = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

    // --- LÓGICA DE EDICIÓN DUAL EN EL CARRITO ---
    const updatePrecioUnitario = (idx, val) => {
        const nC = [...carrito]; nC[idx].precio_venta = Number(val); setCarrito(nC);
    };

    const updateSubtotal = (idx, val) => {
        const nC = [...carrito];
        const it = nC[idx];
        if (it.cantidad > 0) it.precio_venta = Number(val) / it.cantidad;
        setCarrito(nC);
    };

    // --- WHATSAPP BUDGET ---
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
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: VERDE_BJ, color: '#fff', padding: '15px 30px', borderRadius: '20px', fontWeight: '900', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideDown 0.5s ease-out' }}>
                    <span>✅ VENTA REGISTRADA CON ÉXITO</span>
                </div>
            )}

            {/* --- BLOQUE 1: INDICADORES Y TOP 5 --- */}
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
                    <small style={{ fontWeight: '900', opacity: 0.5, fontSize: '11px', display: 'block', marginBottom: '8px' }}>🏆 PRODUCTOS MÁS VENDIDOS</small>
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
                
                {/* --- BLOQUE 2: CATÁLOGO --- */}
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
                            <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>CLIENTE *</label>
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
                                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="999..." style={styleInp} />
                            </div>
                        </div>

                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />

                        <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ padding: '15px', borderRadius: '22px', border: '1px solid #F1F5F9', backgroundColor: '#fff' }}>
                                    <strong style={{ fontSize: '14px', display: 'block' }}>{p.nombre}</strong>
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
                                            <button onClick={() => modCant(p.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900' }}>-</button>
                                            <span style={{ fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => modCant(p.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900' }}>+</button>
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

                {/* --- BLOQUE 3: CARRITO --- */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontSize: '1.2rem', fontWeight: '900' }}>🛒 Carrito</h3>
                    {carrito.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>Selecciona productos</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {carrito.map((item, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong style={{ fontSize: '13px' }}>{item.cantidad}x {item.nombre}</strong>
                                            <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: ROJO_BJ, fontWeight: '900' }}>✕</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <input type="number" value={item.precio_venta} onChange={(e) => updatePrecioUnitario(idx, e.target.value)} style={{ ...styleInp, padding: '10px', fontSize: '13px', textAlign: 'center' }} />
                                            <input type="number" value={(item.precio_venta * item.cantidad).toFixed(2)} onChange={(e) => updateSubtotal(idx, e.target.value)} style={{ ...styleInp, padding: '10px', fontSize: '13px', textAlign: 'center', border: `2px solid ${VERDE_BJ}50` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '15px', borderRadius: '20px', backgroundColor: `${VERDE_BJ}10`, border: `2px dashed ${VERDE_BJ}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '900', fontSize: '12px' }}>EFECTIVO S/</span>
                                    <input type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} style={{ width: '90px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', fontWeight: '900', fontSize: '18px', color: VERDE_BJ }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontWeight: '900', fontSize: '14px' }}>
                                    <span>VUELTO: S/ {vuelto.toFixed(2)}</span>
                                    <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.6rem' }}>TOTAL: S/ {totalCarrito.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={() => ejecutarVentaConAlerta('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>CASH 💵</button>
                                <button onClick={() => ejecutarVentaConAlerta('En Almacén')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>ALMACÉN 📦</button>
                                <button onClick={() => ejecutarVentaConAlerta('Pendiente de Pago')} style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>CRÉDITO 💳</button>
                                <button onClick={handleEnviarWhatsAppPresupuesto} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>WSP 📱</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BLOQUE 4: LIBRO DEL DÍA (EDICIÓN INDIVIDUAL POR ÍTEM) --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900' }}>📖 Libro del Día</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, width: 'auto' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '15px', fontWeight: '900' }}>EXCEL</button>
                    </div>
                </div>

                <input value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} placeholder="🔍 Buscar en libro..." style={{ ...styleInp, marginBottom: '20px' }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {historialVentasDiaBJ.map((g, i) => (
                        <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '25px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', marginBottom: '10px' }}>
                                <span>{g.cliente_nombre} <small style={{ opacity: 0.5 }}>({g.hora})</small></span>
                                <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {g.total.toFixed(2)}</span>
                            </div>
                            
                            {g.items.map((it, idx) => {
                                const isEditing = idEditItemHistorial === it.id;
                                const pM = productos.find(p => p.id === it.producto_id);
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '10px 0', borderBottom: '1px dashed #F1F5F9' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                <input type="number" value={formEditItemHistorial.cantidad} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, cantidad: Number(e.target.value)})} style={{ ...styleInp, padding: '5px', width: '50px' }} />
                                                <strong style={{ fontSize: '10px' }}>{pM?.nombre}</strong>
                                                <input type="number" value={formEditItemHistorial.precio_venta_unitario} onChange={e => setFormEditItemHistorial({...formEditItemHistorial, precio_venta_unitario: Number(e.target.value)})} style={{ ...styleInp, padding: '5px', width: '70px' }} />
                                                <button onClick={() => { handleUpdateItemVentaBJ(it.id, formEditItemHistorial); setIdEditItemHistorial(null); }} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 10px' }}>💾</button>
                                                <button onClick={() => setIdEditItemHistorial(null)} style={{ backgroundColor: '#E2E8F0', border: 'none', borderRadius: '8px', padding: '5px 10px' }}>✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ flex: 1 }}>
                                                    <span>{it.cantidad}x <strong>{pM ? pM.nombre : "Item"}</strong> <small>({it.color})</small></span>
                                                    <br/><small style={{ opacity: 0.5 }}>Unidad: S/ {it.precio_venta_unitario}</small>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ fontWeight: '900' }}>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</span>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button onClick={() => { setIdEditItemHistorial(it.id); setFormEditItemHistorial({ cantidad: it.cantidad, precio_venta_unitario: it.precio_venta_unitario }); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                                        <button onClick={() => { if(confirm("¿Devolver este ítem al stock?")) handleAnularVentaBJ(it); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
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