"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (EXPANDIDO 100% - v1.9.5)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * ACTUALIZACIONES: 
 * 1. Blindaje Anti-Errores (Confirmaciones al cobrar).
 * 2. Barra de Estado de Stock Visual restaurada.
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
    
    // Calculadoras
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
        
        // Blindaje contra Precio 0
        if (!precio || Number(precio) === 0) {
            precio = (p.precio_venta && p.precio_venta > 0) ? p.precio_venta : p.precio_menor;
        }
        if (!precio || Number(precio) === 0) return alert("Error: El producto no tiene precio configurado en la base de datos.");

        setCarrito([...carrito, { 
            producto_id: p.id, 
            nombre: p.nombre, 
            cantidad: cant, 
            color: coloresElegidos[p.id] || 'Único', 
            precio_venta: Number(precio), 
            precio_compra: p.precio_compra 
        }]);
        setCantidades({ ...cantidades, [p.id]: 1 });
    };

    const quitarDelCarrito = (idx) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(idx, 1);
        setCarrito(nuevoCarrito);
    };

    const enviarTicketWA = (data, esPresupuesto = false) => {
        let msg = `*B J IMPORTACIONES CHICLAYO* 💎\n`;
        msg += esPresupuesto ? `*--- PRESUPUESTO ---*\n` : `*--- TICKET DE VENTA ---*\n`;
        msg += `*Cliente:* ${data?.cliente_nombre || cliente}\n------------------\n`;
        
        const items = esPresupuesto ? carrito : data.items;
        items.forEach(it => {
            msg += `• ${it.cantidad}x ${it.nombre} - S/ ${(it.cantidad * (it.precio_venta || it.precio_venta_unitario)).toFixed(2)}\n`;
        });
        
        msg += `------------------\n*TOTAL: S/ ${esPresupuesto ? totalCarrito.toFixed(2) : data.total.toFixed(2)}*\n`;
        msg += `_¡Gracias por tu preferencia!_`;
        
        const tel = data?.telefono || telefono || "";
        window.open(`https://wa.me/51${tel.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* --- BLOQUE 1: INDICADORES SUPERIORES --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ ...styleCrd, padding: '20px', borderLeft: `8px solid ${VERDE_BJ}` }}>
                    <small style={{ fontSize: '11px', fontWeight: '900', opacity: 0.5 }}>CAJA REGISTRADA HOY</small>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</div>
                </div>
                <div style={{ ...styleCrd, padding: '20px', borderLeft: `8px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{ fontSize: '11px', fontWeight: '900', opacity: 0.5 }}>UTILIDAD HOY</small>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {balanceEliteBJ.gH.toFixed(2)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                
                {/* --- BLOQUE 2: CATÁLOGO Y BÚSQUEDA --- */}
                <div style={styleCrd}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛍️ Punto de Venta</h3>
                        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '5px', borderRadius: '12px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : OSCURO_BJ, cursor: 'pointer' }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : OSCURO_BJ, cursor: 'pointer' }}>MENOR</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* IDENTIFICACIÓN DEL CLIENTE */}
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>
                                CLIENTE (Default: Tienda) *
                            </label>
                            <input 
                                list="clis-data" 
                                value={cliente} 
                                onChange={handleAutocompleteCliente} 
                                placeholder="Escribe nombre del cliente..." 
                                style={{ ...styleInp, border: `2px solid ${cliente === 'Tienda' ? '#FCC2E2' : FUCSIA_PRINCIPAL}` }} 
                            />
                            <datalist id="clis-data">
                                {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                            </datalist>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>
                                    LOCALIDAD *
                                </label>
                                <input 
                                    value={localidad} 
                                    onChange={e => setLocalidad(e.target.value)} 
                                    placeholder="Chiclayo" 
                                    style={styleInp} 
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: OSCURO_BJ, marginBottom: '5px', display: 'block' }}>
                                    WHATSAPP (Opcional)
                                </label>
                                <input 
                                    value={telefono} 
                                    onChange={e => setTelefono(e.target.value)} 
                                    placeholder="999000XXX" 
                                    style={styleInp} 
                                />
                            </div>
                        </div>

                        {/* BUSCADOR DE PRODUCTOS (Esto ya lo tienes, asegúrate de no borrarlo) */}
                        <input 
                            value={busqueda} 
                            onChange={e => setBusqueda(e.target.value)} 
                            placeholder="🔍 Buscar modelo en stock..." 
                            style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} 
                        />
                        
                        <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '900' }}>{p.nombre}{getBadgeBJ(p.created_at)}</div>
                                        <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '14px' }}>S/ {tipoVenta === 'Mayor' ? (p.precio_venta || p.precio_menor) : (p.precio_menor || p.precio_venta)}</div>
                                    </div>
                                    
                                    {/* --- BARRA DE STOCK VISUAL (RESTAURADA) --- */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '900', color: p.stock <= 3 ? ROJO_BJ : (p.stock <= 10 ? AMARILLO_BJ : '#64748B') }}>
                                            <span>STOCK FÍSICO: {p.stock}</span>
                                            <span>{p.stock <= 3 ? '¡POR AGOTARSE!' : (p.stock <= 10 ? 'ÚLTIMAS UNIDADES' : 'DISPONIBLE')}</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                                            <div style={{ 
                                                width: `${Math.min((p.stock / 30) * 100, 100)}%`, 
                                                height: '100%', 
                                                backgroundColor: p.stock <= 3 ? ROJO_BJ : (p.stock <= 10 ? AMARILLO_BJ : VERDE_BJ), 
                                                transition: 'width 0.3s ease' 
                                            }}></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 50px', gap: '10px' }}>
                                        <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '10px', fontSize: '12px' }}>
                                            {p.colores?.split(',').map((c, i) => <option key={i} value={c.trim()}>{c.trim()}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ddd' }}>
                                            <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id]||1)-1)})} style={{ flex: 1, border: 'none', background: 'none', padding: '10px', fontWeight: '900', cursor: 'pointer' }}>-</button>
                                            <span style={{ fontSize: '13px', fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                            <button onClick={() => setCantidades({...cantidades, [p.id]: (cantidades[p.id]||1)+1})} style={{ flex: 1, border: 'none', background: 'none', padding: '10px', fontWeight: '900', cursor: 'pointer' }}>+</button>
                                        </div>
                                        <button onClick={() => agregarAlCarrito(p)} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: CARRITO, CALCULADORA Y CIERRE --- */}
                <div style={{ ...styleCrd, border: `3px solid ${OSCURO_BJ}` }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '900' }}>🛒 Carrito de Compras</h3>
                    
                    <div style={{ minHeight: '180px', backgroundColor: '#F8FAFC', borderRadius: '20px', padding: '15px', fontSize: '14px' }}>
                        {carrito.length === 0 && <div style={{textAlign: 'center', opacity: 0.4, marginTop: '50px'}}>El carrito está vacío</div>}
                        {carrito.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #ccc', alignItems: 'center' }}>
    <span>
        <button onClick={() => quitarDelCarrito(idx)} style={{ color: ROJO_BJ, border: 'none', background: 'none', marginRight: '10px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        <strong>{item.cantidad}x</strong> {item.nombre}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <small style={{ opacity: 0.5, fontWeight: '900' }}>S/</small>
        <input 
            type="number" 
            value={item.precio_venta} 
            onChange={(e) => {
                const nuevo = [...carrito];
                nuevo[idx].precio_venta = Number(e.target.value);
                setCarrito(nuevo);
            }} 
            style={{ width: '65px', textAlign: 'right', border: 'none', borderBottom: `1px dashed ${OSCURO_BJ}`, background: 'none', fontSize: '15px', fontWeight: '900', color: OSCURO_BJ, outline: 'none' }} 
        />
    </div>
</div>
                        ))}
                    </div>

                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: '15px', backgroundColor: `${VERDE_BJ}10`, border: `2px dashed ${VERDE_BJ}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>EFECTIVO RECIBIDO S/</span>
                            <input value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)} placeholder="0.00" style={{ width: '90px', textAlign: 'right', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, background: 'none', fontSize: '18px', fontWeight: '900', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: VERDE_BJ, fontWeight: '900' }}>
                            <span>VUELTO A ENTREGAR:</span>
                            <span style={{fontSize: '1.2rem'}}>S/ {vuelto > 0 ? vuelto.toFixed(2) : "0.00"}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '20px 0' }}>
   

    {/* TOTAL FINAL */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2.2rem', fontWeight: '900' }}>
        <span>TOTAL:</span>
        <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {totalCarrito.toFixed(2)}</span>
    </div>
</div>
                    
                    {/* --- BOTONES BLINDADOS CON CONFIRMACIÓN --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => enviarTicketWA(null, true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer' }}>📱 ENVIAR PRESUPUESTO WA</button>
                        
                        <button onClick={() => {
                            if(window.confirm(`¿Confirmar VENTA AL CONTADO por S/ ${totalCarrito.toFixed(2)} y registrar el ingreso en la caja?`)) {
                                handleEjecutarVentaBJ('Entregado');
                            }
                        }} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', fontSize: '16px' }}>💰 COBRAR VENTA (CASH)</button>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={() => {
                                if(window.confirm(`¿Confirmar PAGO COMPLETO por S/ ${totalCarrito.toFixed(2)} y enviar los productos a ALMACÉN?`)) {
                                    handleEjecutarVentaBJ('En Almacén');
                                }
                            }} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>📦 A ALMACÉN (PAGADO)</button>
                            
                            <button onClick={() => { 
                                const a = prompt(`Venta a CRÉDITO.\n\nEl total es S/ ${totalCarrito.toFixed(2)}.\n¿Ingresa el monto de ADELANTO que estás recibiendo HOY? (Escribe 0 si no deja nada):`); 
                                if(a !== null) {
                                    if(window.confirm(`¿Confirmar registro de CRÉDITO con un abono inicial de S/ ${Number(a).toFixed(2)}?`)) {
                                        handleEjecutarVentaBJ('Pendiente de Pago', a); 
                                    }
                                }
                            }} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>💳 DEJAR A CRÉDITO</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BLOQUE 4: HISTORIAL CON CALENDARIO --- */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro de Ventas y Auditoría</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, flex: 1, minWidth: '150px' }} />
                        <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>📊 DESCARGAR EXCEL</button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {historialVentasDiaBJ.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '20px', borderRadius: '25px', border: '1px solid #E2E8F0', backgroundColor: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'flex-start' }}>
                                <div>
                                    <strong style={{ fontSize: '16px' }}>{grupo.cliente_nombre}</strong><br/>
                                    <small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🕒 {grupo.hora} {grupo.localidad ? `| 📍 ${grupo.localidad}` : ''}</small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '1.4rem', color: OSCURO_BJ }}>S/ {grupo.total.toFixed(2)}</strong><br/>
                                    <button onClick={() => enviarTicketWA(grupo)} style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', fontSize: '12px', fontWeight: '900', marginTop: '5px' }}>REENVIAR TICKET 📱</button>
                                </div>
                            </div>
                            
                            <div style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '18px' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', alignItems: 'center' }}>
                                        <span>
                                            • <strong>{it.cantidad}x</strong> {it.nombre} 
                                            <small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', marginLeft: '5px' }}>(S/ {it.precio_venta_unitario})</small>
                                        </span>
                                        <button onClick={() => handleAnularVentaBJ(it)} style={{ border: 'none', background: `${ROJO_BJ}15`, color: ROJO_BJ, borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            🗑️ Anular
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {historialVentasDiaBJ.length === 0 && <div style={{textAlign: 'center', padding: '30px', color: '#64748B'}}>No hay registros de ventas para esta fecha.</div>}
                </div>
            </div>
        </div>
    );
}