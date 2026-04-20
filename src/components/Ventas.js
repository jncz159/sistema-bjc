"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v1.3.5 MASTER)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * CARACTERÍSTICAS:
 * - Control de cantidad (+/-) en catálogo.
 * - Eliminación selectiva de ítems en carrito.
 * - Ticket de Presupuesto y Venta por WhatsApp.
 * - Calculadora de Vuelto integrada.
 * - Calendario de Historial y Excel Forense.
 * - Corrección de Precios (Mayor/Menor).
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

    // --- ESTADO LOCAL PARA CALCULADORA DE CAMBIO ---
    const [efectivoRecibido, setEfectivoRecibido] = useState('');

    // --- LÓGICA DE ETIQUETAS DE TIEMPO (STOCKS NUEVOS) ---
    const getBadgeBJ = (dateString) => {
        const pDate = new Date(dateString);
        const hoy = new Date();
        const diffDays = Math.ceil(Math.abs(hoy - pDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) return <span style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', marginLeft: '10px' }}>NUEVO 🔥</span>;
        if (diffDays <= 7) return <span style={{ backgroundColor: AMARILLO_BJ, color: '#fff', padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', marginLeft: '10px' }}>RECIENTE ⭐</span>;
        return null;
    };

    // --- LÓGICA DE CANTIDADES (+ / -) ---
    const modificarCantidad = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

    // --- AGREGAR AL CARRITO (CON CORRECCIÓN DE PRECIO 0) ---
    const agregarAlCarrito = (p) => {
        const cant = Number(cantidades[p.id] || 1);
        const col = coloresElegidos[p.id] || (p.colores?.split(',')[0]?.trim() || 'Único');
        
        // CORRECCIÓN: Si el precio es 0 o vacío, toma el otro disponible para evitar errores
        let precio = tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor;
        if (!precio || Number(precio) === 0) {
            precio = tipoVenta === 'Mayor' ? p.precio_menor : p.precio_venta;
        }

        setCarrito([...carrito, { 
            producto_id: p.id, 
            nombre: p.nombre, 
            cantidad: cant, 
            color: col, 
            precio_venta: Number(precio), 
            precio_compra: p.precio_compra 
        }]);
        
        // Reset local
        setCantidades({ ...cantidades, [p.id]: 1 });
    };

    const quitarDelCarrito = (index) => {
        const nuevo = [...carrito];
        nuevo.splice(index, 1);
        setCarrito(nuevo);
    };

    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0) - Number(descuento);
    const vuelto = efectivoRecibido ? (Number(efectivoRecibido) - totalCarrito) : 0;

    // --- WHATSAPP TICKETS (PRESUPUESTO Y HISTORIAL) ---
    const enviarMensajeWhatsApp = (data, esPresupuesto = false) => {
        let msg = `*B J IMPORTACIONES CHICLAYO* 💎\n`;
        msg += esPresupuesto ? `*--- PRESUPUESTO ---*\n` : `*--- COMPROBANTE DE VENTA ---*\n`;
        msg += `*Cliente:* ${data?.cliente_nombre || cliente}\n`;
        msg += `*Localidad:* ${data?.localidad || localidad}\n`;
        msg += `----------------------------\n`;

        const items = esPresupuesto ? carrito : data.items;
        items.forEach(it => {
            const pN = productos.find(p => p.id === it.producto_id)?.nombre || it.nombre;
            msg += `• ${it.cantidad}x ${pN} (${it.color}) - S/ ${(it.cantidad * (it.precio_venta || it.precio_venta_unitario)).toFixed(2)}\n`;
        });

        msg += `----------------------------\n`;
        msg += `*TOTAL: S/ ${esPresupuesto ? totalFinal.toFixed(2) : data.total.toFixed(2)}*\n\n`;
        msg += esPresupuesto ? `_Precios sujetos a disponibilidad._` : `_¡Gracias por tu preferencia en Chiclayo!_`;

        const fone = data?.telefono || telefono || "";
        window.open(`https://wa.me/51${fone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* BLOQUE 1: INDICADORES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, borderLeft: `12px solid ${VERDE_BJ}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5 }}>CAJA REGISTRADA HOY</small>
                    <h2 style={{ fontSize: '2.8rem', margin: 0 }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                </div>
                <div style={{ ...styleCrd, borderLeft: `12px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontWeight: '900', opacity: 0.5 }}>UTILIDAD ESTIMADA</small>
                    <h2 style={{ fontSize: '2.8rem', margin: 0, color: FUCSIA_PRINCIPAL }}>S/ {balanceEliteBJ.gH.toFixed(2)}</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', alignItems: 'start' }}>
                
                {/* BLOQUE 2: CATÁLOGO Y BUSCADOR */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛍️ Punto de Venta</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '5px', borderRadius: '12px', gap: '5px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : OSCURO_BJ }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : OSCURO_BJ }}>MENOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input list="clientes-lista" value={cliente} onChange={handleAutocompleteCliente} placeholder="Nombre del Cliente" style={styleInp} />
                        <datalist id="clientes-lista">
                            {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                        </datalist>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="📍 Localidad" style={styleInp} />
                            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="📞 WhatsApp" style={styleInp} />
                        </div>

                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar modelo en stock..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />
                        
                        <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 45px', gap: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '15px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '900' }}>{p.nombre}{getBadgeBJ(p.created_at)}</div>
                                        <small style={{ color: VERDE_BJ, fontWeight: '700' }}>S/ {tipoVenta === 'Mayor' ? (p.precio_venta || p.precio_menor) : (p.precio_menor || p.precio_venta)} | Stock: {p.stock}</small>
                                    </div>
                                    <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '5px', fontSize: '11px', height: '35px' }}>
                                        {p.colores?.split(',').map((c, i) => <option key={i} value={c.trim()}>{c.trim()}</option>)}
                                    </select>
                                    
                                    {/* CONTROLES DE CANTIDAD (+ / -) */}
                                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                                        <button onClick={() => modificarCantidad(p.id, -1)} style={{ border: 'none', padding: '8px', cursor: 'pointer', flex: 1, fontWeight: '900' }}>-</button>
                                        <span style={{ padding: '0 5px', fontSize: '12px', fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                        <button onClick={() => modificarCantidad(p.id, 1)} style={{ border: 'none', padding: '8px', cursor: 'pointer', flex: 1, fontWeight: '900' }}>+</button>
                                    </div>

                                    <button onClick={() => agregarAlCarrito(p)} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', height: '40px' }}>+</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BLOQUE 3: CARRITO, CAMBIO Y CIERRE */}
                <div style={{ ...styleCrd, border: `3px solid ${OSCURO_BJ}` }}>
                    <h3 style={{ marginTop: 0, fontWeight: '900' }}>🛒 Carrito de Compra</h3>
                    <div style={{ minHeight: '220px', backgroundColor: '#F8FAFC', borderRadius: '25px', padding: '20px' }}>
                        {carrito.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #ccc', alignItems: 'center' }}>
                                <div>
                                    <button onClick={() => quitarDelCarrito(idx)} style={{ border: 'none', background: 'none', color: ROJO_BJ, cursor: 'pointer', marginRight: '10px' }}>✕</button>
                                    <strong>{item.cantidad}x</strong> {item.nombre} <small>({item.color})</small>
                                </div>
                                <strong>S/ {(item.precio_venta * item.cantidad).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>

                    {/* CALCULADORA DE VUELTO INTEGRADA */}
                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: '20px', backgroundColor: `${VERDE_BJ}10`, border: `1px dashed ${VERDE_BJ}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>PAGO CON:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>S/</strong>
                                <input value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder="0.00" style={{ width: '80px', textAlign: 'right', background: 'none', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, outline: 'none', fontWeight: '900' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            <span style={{ fontWeight: '900' }}>VUELTO:</span>
                            <strong style={{ fontSize: '1.3rem', color: VERDE_BJ }}>S/ {vuelto > 0 ? vuelto.toFixed(2) : "0.00"}</strong>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: `4px double ${OSCURO_BJ}`, paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2.5rem', fontWeight: '900' }}>
                            <span>TOTAL:</span>
                            <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '25px' }}>
                        <button onClick={() => enviarMensajeWhatsApp(null, true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>📱 ENVIAR PRESUPUESTO</button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>💰 COBRAR</button>
                            <button onClick={() => {
                                const abono = prompt("MONTO QUE RECIBES HOY:");
                                if (abono !== null) handleEjecutarVentaBJ('Pendiente de Pago', abono);
                            }} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>💳 CRÉDITO</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BLOQUE 4: HISTORIAL CON CALENDARIO (RESTAURADO) */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '35px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem' }}>📖 Libro de Ventas</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Historial auditado con desglose de precios.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, padding: '12px', width: 'auto', border: `2px solid ${FUCSIA_PRINCIPAL}40` }} />
                        <input value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} placeholder="Filtrar cliente..." style={{ ...styleInp, padding: '12px', width: '200px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>📊 EXCEL FULL</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '25px' }}>
                    {historialVentasDiaBJ.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '30px', borderRadius: '35px', backgroundColor: '#fff', border: '1px solid #F1F5F9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div>
                                    <strong style={{ fontSize: '1.2rem' }}>{grupo.cliente_nombre}</strong>
                                    <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🕒 {grupo.hora} | 📍 {grupo.localidad}</small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '1.5rem' }}>S/ {grupo.total.toFixed(2)}</strong><br/>
                                    <button onClick={() => enviarMensajeWhatsApp(grupo)} style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', fontSize: '11px', fontWeight: '900' }}>ENVIAR TICKET 📱</button>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '25px' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                                        <span>• <strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre} <small style={{color: FUCSIA_PRINCIPAL}}>(S/ {it.precio_venta_unitario.toFixed(2)})</small></span>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <strong>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</strong>
                                            <button onClick={() => handleAnularVentaBJ(it)} style={{ border: 'none', background: `${ROJO_BJ}15`, color: ROJO_BJ, borderRadius: '8px', cursor: 'pointer', width: '25px', height: '25px' }}>🗑️</button>
                                        </div>
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