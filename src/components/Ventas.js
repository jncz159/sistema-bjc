"use client";
import React, { useState } from 'react';
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
    // --- ESTADOS LOCALES PARA CAJA Y CAMBIO ---
    const [dineroRecibido, setDineroRecibido] = useState('');

    // --- LÓGICA DE ETIQUETAS DE TIEMPO ---
    const getBadgeBJ = (dateString) => {
        const pDate = new Date(dateString);
        const hoy = new Date();
        const diffDays = Math.ceil(Math.abs(hoy - pDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) return <span style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', marginLeft: '10px' }}>NUEVO 🔥</span>;
        if (diffDays <= 7) return <span style={{ backgroundColor: AMARILLO_BJ, color: '#fff', padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', marginLeft: '10px' }}>RECIENTE ⭐</span>;
        return null;
    };

    // --- LÓGICA DE CARRITO ---
    const agregarAlCarrito = (p) => {
        const cant = Number(cantidades[p.id] || 1);
        const col = coloresElegidos[p.id] || (p.colores?.split(',')[0]?.trim() || 'Único');
        const precio = tipoVenta === 'Mayor' ? p.precio_venta : p.precio_menor;
        setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cant, color: col, precio_venta: precio, precio_compra: p.precio_compra }]);
        setCantidades({ ...cantidades, [p.id]: '' });
    };

    const subtotalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0);
    const totalFinal = subtotalCarrito - Number(descuento);
    const vuelto = dineroRecibido ? (Number(dineroRecibido) - totalFinal) : 0;

    // --- FUNCIÓN MAESTRA: WHATSAPP TICKET ---
    const enviarTicketWhatsApp = (data, esPresupuesto = false) => {
        let msg = `*B J IMPORTACIONES CHICLAYO* 💎\n`;
        msg += esPresupuesto ? `*--- PRESUPUESTO ---*\n` : `*--- TICKET DE VENTA ---*\n`;
        msg += `*Cliente:* ${data.cliente_nombre || cliente}\n`;
        msg += `*Fecha:* ${fechaConsulta}\n`;
        msg += `----------------------------\n`;
        
        const items = esPresupuesto ? carrito : data.items;
        items.forEach(it => {
            const pNombre = productos.find(p => p.id === it.producto_id)?.nombre || it.nombre;
            msg += `• ${it.cantidad}x ${pNombre} (${it.color}) - S/ ${(it.cantidad * (it.precio_venta || it.precio_venta_unitario)).toFixed(2)}\n`;
        });

        msg += `----------------------------\n`;
        if (descuento > 0 && esPresupuesto) msg += `*Descuento:* -S/ ${descuento}\n`;
        msg += `*TOTAL A PAGAR: S/ ${esPresupuesto ? totalFinal.toFixed(2) : data.total.toFixed(2)}*\n\n`;
        msg += esPresupuesto ? `_Válido por hoy. ¡Reserva tu pedido!_` : `_¡Gracias por tu compra en Chiclayo!_`;

        const phone = data.telefono || telefono || "";
        window.open(`https://wa.me/51${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
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
                
                {/* BLOQUE 2: CATÁLOGO Y BUSQUEDA */}
                <div style={styleCrd}>
                    <h3 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛍️ Punto de Venta</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input list="clientes-list" value={cliente} onChange={handleAutocompleteCliente} placeholder="Cliente (Autocomplete)" style={styleInp} />
                        <datalist id="clientes-list">
                            {[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                        </datalist>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="📍 Localidad" style={styleInp} />
                            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="📞 WhatsApp" style={styleInp} />
                        </div>

                        <div style={{ background: '#F1F5F9', padding: '5px', borderRadius: '15px', display: 'flex', gap: '5px' }}>
                            <button onClick={() => setTipoVenta('Mayor')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : OSCURO_BJ }}>MAYOR</button>
                            <button onClick={() => setTipoVenta('Menor')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : OSCURO_BJ }}>MENOR</button>
                        </div>

                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por nombre..." style={{ ...styleInp, border: `2px solid ${OSCURO_BJ}` }} />
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => (
                                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 45px', gap: '10px', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
                                    <div style={{fontSize:'13px', fontWeight:'900'}}>{p.nombre}{getBadgeBJ(p.created_at)}<br/><small style={{color:VERDE_BJ}}>S/ {tipoVenta==='Mayor'?p.precio_venta:p.precio_menor} | Stock: {p.stock}</small></div>
                                    <select onChange={e=>setColoresElegidos({...coloresElegidos,[p.id]:e.target.value})} style={{...styleInp, padding:'5px', fontSize:'11px'}}>{p.colores?.split(',').map((c,i)=><option key={i} value={c.trim()}>{c.trim()}</option>)}</select>
                                    <input type="number" value={cantidades[p.id]||''} onChange={e=>setCantidades({...cantidades,[p.id]:e.target.value})} placeholder="Cant" style={{...styleInp, padding:'5px'}} />
                                    <button onClick={()=>agregarAlCarrito(p)} style={{backgroundColor:OSCURO_BJ, color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'900', height:'35px'}}>+</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BLOQUE 3: CARRITO, VUELTO Y WHATSAPP */}
                <div style={{ ...styleCrd, border: `3px solid ${OSCURO_BJ}` }}>
                    <h3 style={{ marginTop: 0, fontWeight: '900' }}>🛒 Carrito y Caja</h3>
                    <div style={{ minHeight: '200px', backgroundColor: '#F8FAFC', borderRadius: '25px', padding: '20px' }}>
                        {carrito.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #ccc' }}>
                                <span><strong>{item.cantidad}x</strong> {item.nombre}</span>
                                <strong>S/ {(item.precio_venta * item.cantidad).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>

                    {/* CALCULADORA DE VUELTO */}
                    <div style={{ marginTop: '20px', backgroundColor: `${VERDE_BJ}10`, padding: '15px', borderRadius: '20px', border: `1px dashed ${VERDE_BJ}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '900', fontSize: '13px' }}>EFECTIVO RECIBIDO:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>S/</strong>
                                <input value={dineroRecibido} onChange={e => setDineroRecibido(e.target.value)} placeholder="0.00" style={{ width: '80px', textAlign: 'right', background: 'none', border: 'none', borderBottom: `2px solid ${VERDE_BJ}`, fontWeight: '900', outline: 'none' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: VERDE_BJ }}>
                            <span style={{ fontWeight: '900' }}>VUELTO A DAR:</span>
                            <strong style={{ fontSize: '1.2rem' }}>S/ {vuelto > 0 ? vuelto.toFixed(2) : "0.00"}</strong>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: `4px double ${OSCURO_BJ}`, paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2.5rem', fontWeight: '900' }}>
                            <span>TOTAL:</span>
                            <span style={{ color: FUCSIA_PRINCIPAL }}>S/ {totalFinal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '25px' }}>
                        <button onClick={() => enviarTicketWhatsApp(null, true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>📱 ENVIAR PRESUPUESTO POR WHATSAPP</button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>💰 COBRAR CASH</button>
                            <button onClick={() => {
                                const abono = prompt("¿CUÁNTO DINERO ESTÁ ABONANDO HOY?");
                                if (abono !== null) handleEjecutarVentaBJ('Pendiente de Pago', abono);
                            }} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>💳 DAR CRÉDITO</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BLOQUE 4: HISTORIAL CON TICKET WHATSAPP */}
            <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <h3 style={{ margin: 0, fontWeight: '900' }}>📖 Historial del Día</h3>
                    <button onClick={handleExportarExcelCajaFull} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>📊 EXCEL FULL</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {historialVentasDiaBJ.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', borderRadius: '30px', backgroundColor: '#fff', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div><strong>{grupo.cliente_nombre}</strong><br/><small style={{color:FUCSIA_PRINCIPAL}}>🕒 {grupo.hora} | 📍 {grupo.localidad}</small></div>
                                <div style={{textAlign:'right'}}>
                                    <strong style={{ fontSize: '1.3rem' }}>S/ {grupo.total.toFixed(2)}</strong><br/>
                                    <button onClick={() => enviarTicketWhatsApp(grupo)} style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', fontSize: '12px', fontWeight: '900' }}>ENVIAR TICKET 📱</button>
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                        <span>• <strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre} <small style={{color:FUCSIA_PRINCIPAL}}>(S/ {it.precio_venta_unitario.toFixed(2)})</small></span>
                                        <strong>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</strong>
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