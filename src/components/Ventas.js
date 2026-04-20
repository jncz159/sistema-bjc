"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v1.7.0 DEFINITIVA)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * * AUDITORÍA DE FUNCIONES:
 * - Filtro Mayor/Menor con fix de Precio 0.
 * - Cantidades +/- en catálogo.
 * - Eliminación de ítem en carrito.
 * - Calculadora de Vuelto (Mobile Ready).
 * - Triple Acción: Cobrar, Almacén, Crédito.
 * - Historial con Calendario y Ticket WhatsApp.
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
    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0) - Number(descuento);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    const getBadgeBJ = (dateString) => {
        const diff = Math.ceil(Math.abs(new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return <span style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '3px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', marginLeft: '8px' }}>NUEVO 🔥</span>;
        return null;
    };

    const agregarAlCarrito = (p) => {
        const cant = Number(cantidades[p.id] || 1);
        let precio = tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor;
        if (!precio || Number(precio) === 0) precio = p.precio_venta || p.precio_menor;
        
        setCarrito([...carrito, { 
            producto_id: p.id, nombre: p.nombre, cantidad: cant, 
            color: coloresElegidos[p.id] || 'Único', 
            precio_venta: Number(precio), precio_compra: p.precio_compra 
        }]);
        setCantidades({ ...cantidades, [p.id]: 1 });
    };

    const enviarWA = (data, esPresupuesto = false) => {
        let msg = `*B J IMPORTACIONES* 💎\n${esPresupuesto ? '*PRESUPUESTO*' : '*TICKET DE VENTA*'}\n*Cliente:* ${data?.cliente_nombre || cliente}\n------------------\n`;
        const items = esPresupuesto ? carrito : data.items;
        items.forEach(it => {
            msg += `• ${it.cantidad}x ${it.nombre} - S/ ${(it.cantidad * (it.precio_venta || it.precio_venta_unitario)).toFixed(2)}\n`;
        });
        msg += `------------------\n*TOTAL: S/ ${esPresupuesto ? totalCarrito.toFixed(2) : data.total.toFixed(2)}*`;
        window.open(`https://wa.me/51${(data?.telefono || telefono || "").replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* KPI MOBILE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ ...styleCrd, padding: '15px', borderLeft: `6px solid ${VERDE_BJ}` }}>
                    <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5 }}>CAJA HOY</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '15px', borderLeft: `6px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5 }}>UTILIDAD</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* CATALOGO */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: FUCSIA_PRINCIPAL }}>🛍️ Vender</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '10px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : OSCURO_BJ }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : OSCURO_BJ }}>MENOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input list="clis" value={cliente} onChange={handleAutocompleteCliente} placeholder="Cliente" style={styleInp} />
                        <datalist id="clis">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="Localidad" style={styleInp} />
                            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="WhatsApp" style={styleInp} />
                        </div>

                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />
                        
                        <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '900' }}>{p.nombre}{getBadgeBJ(p.created_at)}</div>
                                        <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '13px' }}>S/ {tipoVenta === 'Mayor' ? (p.precio_venta || p.precio_menor) : (p.precio_menor || p.precio_venta)}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 45px', gap: '8px' }}>
                                        <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '8px', fontSize: '11px' }}>
                                            {p.colores?.split(',').map((c, i) => <option key={i} value={c.trim()}>{c.trim()}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #ddd' }}>
                                            <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id]||1)-1)})} style={{ flex: 1, border: 'none', background: 'none', padding: '8px' }}>-</button>
                                            <span style={{ fontSize: '12px', fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => setCantidades({...cantidades, [p.id]: (cantidades[p.id]||1)+1})} style={{ flex: 1, border: 'none', background: 'none', padding: '8px' }}>+</button>
                                        </div>
                                        <button onClick={() => agregarAlCarrito(p)} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900' }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CARRITO */}
                <div style={{ ...styleCrd, border: `2px solid ${OSCURO_BJ}` }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>🛒 Carrito</h3>
                    <div style={{ minHeight: '150px', backgroundColor: '#F8FAFC', borderRadius: '15px', padding: '12px', fontSize: '13px' }}>
                        {carrito.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc' }}>
                                <span><button onClick={() => { const n = [...carrito]; n.splice(idx,1); setCarrito(n); }} style={{ color: ROJO_BJ, border: 'none', background: 'none', marginRight: '5px' }}>✕</button>{item.cantidad}x {item.nombre}</span>
                                <strong>S/ {(item.precio_venta * item.cantidad).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                    
                    {/* CALCULADORA VUELTO */}
                    <div style={{ marginTop: '15px', padding: '12px', borderRadius: '12px', backgroundColor: `${VERDE_BJ}10`, border: `1px dashed ${VERDE_BJ}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900' }}>PAGO CON S/</span>
                            <input value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder="0.00" style={{ width: '80px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', fontSize: '18px', fontWeight: '900' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', color: VERDE_BJ, fontWeight: '900' }}><span>VUELTO:</span><span>S/ {vuelto.toFixed(2)}</span></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: '900', margin: '15px 0' }}><span>TOTAL:</span><span style={{ color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</span></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button onClick={() => enviarWA(null, true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900' }}>📱 ENVIAR PRESUPUESTO</button>
                        <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900' }}>💰 COBRAR CASH</button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900', fontSize: '11px' }}>📦 ALMACÉN</button>
                            <button onClick={() => { const a = prompt("¿MONTO DE ADELANTO?"); if(a) handleEjecutarVentaBJ('Pendiente de Pago', a); }} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900', fontSize: '11px' }}>💳 CRÉDITO</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* HISTORIAL */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900' }}>📖 Libro de Ventas</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, flex: 1 }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '12px' }}>📊 EXCEL</button>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {historialVentasDiaBJ.map((g, idx) => (
                        <div key={idx} style={{ padding: '18px', borderRadius: '22px', border: '1px solid #eee', backgroundColor: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div><strong style={{ fontSize: '15px' }}>{g.cliente_nombre}</strong><br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🕒 {g.hora}</small></div>
                                <div style={{ textAlign: 'right' }}><strong style={{ fontSize: '1.2rem' }}>S/ {g.total.toFixed(2)}</strong><br/><button onClick={() => enviarWA(g)} style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', fontSize: '11px', fontWeight: '900' }}>TICKET WA 📱</button></div>
                            </div>
                            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '15px', fontSize: '12px' }}>
                                {g.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>• {it.cantidad}x {it.nombre} <small style={{ color: FUCSIA_PRINCIPAL }}>(S/ {it.precio_venta_unitario})</small></span>
                                        <button onClick={() => handleAnularVentaBJ(it)} style={{ border: 'none', background: 'none', color: ROJO_BJ }}>🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}