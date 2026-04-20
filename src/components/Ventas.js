"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v1.2.8 MASTER)
 * ESTADO: TOTAL TRANSPARENCY - AUDITADO SIN RECORTES
 * CARACTERÍSTICAS: Historial con Precios, Autocomplete, Filtros Pro, Excel Forense.
 * ============================================================================
 */
import React from 'react';
import { handleInputMonto } from '../lib/helpers';

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

    // --- LOGICA DE CARRITO: PROTECCIÓN DE PRECIOS ---
    const agregarAlCarrito = (p) => {
        const cant = Number(cantidades[p.id] || 1);
        const col = coloresElegidos[p.id] || (p.colores?.split(',')[0]?.trim() || 'Único');
        const precio = tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor;

        const nuevoItem = {
            producto_id: p.id,
            nombre: p.nombre,
            cantidad: cant,
            color: col,
            precio_venta: precio,
            precio_compra: p.precio_compra
        };

        setCarrito([...carrito, nuevoItem]);
        // Limpiamos solo el input de cantidad del producto agregado
        setCantidades({ ...cantidades, [p.id]: '' });
    };

    const quitarDelCarrito = (index) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0) - descuento;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* --- BLOQUE 1: PANEL DE CONTROL RÁPIDO --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ ...styleCrd, borderLeft: `12px solid ${VERDE_BJ}`, background: '#fff' }}>
                    <h4 style={{ margin: 0, opacity: 0.5, fontSize: '12px', fontWeight: '900' }}>CAJA REGISTRADA HOY</h4>
                    <h2 style={{ fontSize: '2.8rem', margin: 0, color: OSCURO_BJ }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                </div>
                <div style={{ ...styleCrd, borderLeft: `12px solid ${FUCSIA_PRINCIPAL}`, background: '#fff' }}>
                    <h4 style={{ margin: 0, opacity: 0.5, fontSize: '12px', fontWeight: '900' }}>UTILIDAD BRUTA ESTIMADA</h4>
                    <h2 style={{ fontSize: '2.8rem', margin: 0, color: FUCSIA_PRINCIPAL }}>S/ {balanceEliteBJ.gH.toFixed(2)}</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', alignItems: 'start' }}>
                
                {/* --- BLOQUE 2: INTERFAZ DE VENTA DIRECTA --- */}
                <div style={styleCrd}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '1.5rem' }}>🛍️ Punto de Venta</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '5px', borderRadius: '12px', gap: '5px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : OSCURO_BJ }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : OSCURO_BJ }}>MENOR</button>
                        </div>
                    </header>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                list="clientes-data"
                                value={cliente} 
                                onChange={handleAutocompleteCliente} 
                                placeholder="Nombre del Cliente (Autocomplete)" 
                                style={{ ...styleInp, border: `2px solid ${FUCSIA_PRINCIPAL}20` }} 
                            />
                            <datalist id="clientes-data">
                                {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                            </datalist>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="📍 Localidad / Zona" style={styleInp} />
                            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="📞 WhatsApp / Celular" style={styleInp} />
                        </div>

                        {/* CATÁLOGO DINÁMICO */}
                        <div style={{ border: `2px solid ${OSCURO_BJ}`, borderRadius: '20px', padding: '15px' }}>
                            <input 
                                value={busqueda} 
                                onChange={e => setBusqueda(e.target.value)} 
                                placeholder="🔍 Buscar modelo por nombre..." 
                                style={{ ...styleInp, marginBottom: '15px', border: 'none', background: '#F8FAFC' }} 
                            />
                            
                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 45px', gap: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '12px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '900' }}>{p.nombre}</div>
                                            <small style={{ color: VERDE_BJ, fontWeight: '700' }}>S/ {tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor} | Stock: {p.stock}</small>
                                        </div>
                                        <select 
                                            value={coloresElegidos[p.id] || ''}
                                            onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})}
                                            style={{ ...styleInp, padding: '6px', fontSize: '10px', height: '35px' }}
                                        >
                                            <option value="">Color...</option>
                                            {p.colores?.split(',').map((c, i) => <option key={i} value={c.trim()}>{c.trim()}</option>)}
                                        </select>
                                        <input 
                                            type="number" 
                                            value={cantidades[p.id] || ''} 
                                            onChange={e => setCantidades({...cantidades, [p.id]: e.target.value})} 
                                            placeholder="Cant" 
                                            style={{ ...styleInp, padding: '6px', textAlign: 'center', height: '35px' }} 
                                        />
                                        <button onClick={() => agregarAlCarrito(p)} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', height: '35px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>+</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: EL CARRITO - REVISIÓN DE VALORES --- */}
                <div style={{ ...styleCrd, border: `2px solid ${OSCURO_BJ}` }}>
                    <h3 style={{ marginTop: 0, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>🛒 Detalle de Venta</h3>
                    
                    <div style={{ minHeight: '250px', backgroundColor: '#F8FAFC', borderRadius: '25px', padding: '20px' }}>
                        {carrito.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, marginTop: '80px' }}>El carrito está vacío</p>}
                        {carrito.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed #CBD5E1', alignItems: 'center' }}>
                                <div>
                                    <button onClick={() => quitarDelCarrito(idx)} style={{ border: 'none', background: 'none', color: ROJO_BJ, cursor: 'pointer', marginRight: '10px' }}>✕</button>
                                    <strong style={{ fontSize: '14px' }}>{item.cantidad}x {item.nombre}</strong>
                                    <br/><small style={{ color: '#64748B' }}>Color: {item.color} | S/ {item.precio_venta} c/u</small>
                                </div>
                                <strong style={{ fontSize: '15px' }}>S/ {(item.precio_venta * item.cantidad).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '25px', padding: '0 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span>Subtotal:</span>
                            <span>S/ {carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                            <span>Descuento Especial:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>- S/</strong>
                                <input value={descuento} onChange={e => setDescuento(e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${ROJO_BJ}`, outline: 'none', fontWeight: '900', color: ROJO_BJ }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem', fontWeight: '900', borderTop: `4px double ${OSCURO_BJ}`, paddingTop: '15px' }}>
                            <span>TOTAL:</span>
                            <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
                        <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', boxShadow: `0 10px 20px ${VERDE_BJ}30` }}>💰 COBRAR CASH</button>
                        <button onClick={() => {
                            const abono = prompt("¿Monto del Abono Inicial?");
                            if (abono !== null) handleEjecutarVentaBJ('Pendiente de Pago', abono);
                        }} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', boxShadow: `0 10px 20px ${AMARILLO_BJ}30` }}>💳 DAR CRÉDITO</button>
                    </div>
                </div>
            </div>

            {/* --- BLOQUE 4: HISTORIAL FORENSE (RESTAURADO CON PRECIOS) --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '25px', marginBottom: '35px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem' }}>📖 Libro de Ventas del Día</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: '600' }}>Auditoría completa de movimientos en Chiclayo.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, padding: '12px', width: 'auto' }} />
                        <input value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} placeholder="Filtrar cliente..." style={{ ...styleInp, padding: '12px', width: '200px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', transition: '0.3s' }}>📊 EXCEL COMPLETO</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '25px' }}>
                    {historialVentasDiaBJ.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '30px', borderRadius: '35px', backgroundColor: '#fff', border: '1px solid #F1F5F9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <strong style={{ fontSize: '1.2rem', color: OSCURO_BJ }}>{grupo.cliente_nombre}</strong>
                                    <br/><small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>🕒 Registrado: {grupo.hora}</small>
                                    <br/><small style={{ color: '#94A3B8' }}>📍 {grupo.localidad}</small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: '900', color: OSCURO_BJ }}>S/ {grupo.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* DESGLOSE DE PRODUCTOS CON VALOR DE VENTA (LO QUE PEDISTE) */}
                            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '25px', marginBottom: '20px' }}>
                                <small style={{ fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '10px', fontSize: '10px', textTransform: 'uppercase' }}>Detalle de ítems:</small>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', alignItems: 'center' }}>
                                        <span style={{ color: '#334155' }}>
                                            • <strong>{it.cantidad}x</strong> {productos.find(p => p.id === it.producto_id)?.nombre || 'Modelo'} 
                                            <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '700' }}> (S/ {it.precio_venta_unitario.toFixed(2)})</span>
                                        </span>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            <strong style={{ color: OSCURO_BJ }}>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</strong>
                                            <button 
                                                onClick={() => handleAnularVentaBJ(it)} 
                                                style={{ border: 'none', background: `${ROJO_BJ}15`, color: ROJO_BJ, width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '9px', color: '#CBD5E1' }}>REF: {grupo.id_grupo}</div>
                                <div style={{ backgroundColor: grupo.items[0].estado_pedido === 'Pendiente de Pago' ? AMARILLO_BJ : VERDE_BJ, color: '#fff', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900' }}>
                                    {grupo.items[0].estado_pedido === 'Pendiente de Pago' ? 'CRÉDITO' : 'PAGADO'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}