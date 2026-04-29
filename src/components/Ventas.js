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
    // NUEVOS ESTADOS DE UX
    const [isProcessing, setIsProcessing] = useState(false);
    const [animatingId, setAnimatingId] = useState(null);
// Agrega esta línea junto a los otros useState al inicio del componente
const [esCredito, setEsCredito] = useState(false);
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);
// Calculadora automática del stock total
    const stockTotalUnidades = productos.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    // --- FUNCIÓN DE EJECUCIÓN CON DOBLE VALIDACIÓN ---
    // --- FUNCIÓN DE EJECUCIÓN ACTUALIZADA ---
    const ejecutarVentaConAlerta = async (modo) => {
        const mensaje = `⚠️ ¿PROCESAR VENTA? ⚠️\n\n` +
                        `Cliente: ${cliente}\n` +
                        `Total: S/ ${totalCarrito.toFixed(2)}\n` +
                        `Recibido: S/ ${Number(efectivoRecibido || 0).toFixed(2)}\n\n` +
                        `¿Confirmar registro?`;

        const confirmacion = window.confirm(mensaje);
        
        if (confirmacion) {
            try {
                setIsProcessing(true);

                // --- EL CEREBRO DEL COBRO ---
                // --- EL CEREBRO DEL COBRO BLINDADO ---
                const efectivoLimpio = Number(efectivoRecibido || 0);
                
                // Si el modo es 'Pendiente de Pago' (vía botón Crédito), es crédito sí o sí
                const esRealmenteCredito = modo === 'Pendiente de Pago' || esCredito;
                
                const deudaReal = esRealmenteCredito ? (totalCarrito - efectivoLimpio) : 0;
                const yapeReal = (!esRealmenteCredito && efectivoLimpio < totalCarrito) ? (totalCarrito - efectivoLimpio) : 0;
                const efectivoParaCaja = (!esRealmenteCredito && efectivoLimpio > totalCarrito) ? totalCarrito : efectivoLimpio;

                const desglosePago = {
                    monto_efectivo: Number(efectivoParaCaja || 0),
                    monto_yape: Number(yapeReal || 0),
                    saldo_pendiente: Number(deudaReal || 0),
                    metodo_pago: esRealmenteCredito ? 'Crédito' : (yapeReal > 0 ? 'Yape/Mixto' : 'Efectivo')
                };

                // Enviamos el objeto con todo el detalle
                await handleEjecutarVentaBJ(modo, desglosePago);
                
                setShowSuccess(true);
                setEfectivoRecibido('');
                setEsCredito(false); 
                setIsProcessing(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
            } catch (error) {
                alert("❌ Error en el búnker.");
                setIsProcessing(false);
            }
        } else {
            // Si cancela, no hace nada y mantiene los productos en el carrito
            console.log("Operación cancelada por el usuario");
        }
    };

    const modCant = (id, delta) => {
        const actual = Number(cantidades[id] || 1);
        const nueva = Math.max(1, actual + delta);
        setCantidades({ ...cantidades, [id]: nueva });
    };

   // --- CÁLCULOS DE COBRO INTELIGENTE ---
    const totalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    
    // Si no es crédito y recibes más de lo que cuesta -> hay vuelto
    const vuelto = (!esCredito && Number(efectivoRecibido) > totalCarrito) ? (Number(efectivoRecibido) - totalCarrito) : 0;
    
    // Si no es crédito y recibes menos -> el sistema asume que el resto es YAPE
    const montoYape = (!esCredito && Number(efectivoRecibido) < totalCarrito) ? (totalCarrito - Number(efectivoRecibido)) : 0;
    
    // Si es crédito -> calculamos cuánto falta pagar
    const saldoPendiente = esCredito ? (totalCarrito - Number(efectivoRecibido)) : 0;

    const handleWhatsApp = () => {
        let msg = `*BJ IMPORTACIONES - PRESUPUESTO*%0A`;
        msg += `Cliente: ${cliente}%0A----------------------------%0A`;
        carrito.forEach(i => { msg += `• ${i.cantidad}x ${i.nombre} (${i.color}) - S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`; });
        msg += `----------------------------%0A*TOTAL: S/ ${totalCarrito.toFixed(2)}*%0A`;
        window.open(`https://wa.me/51${telefono}?text=${msg}`, '_blank');
    };
const enviarComprobanteWA_Historial = (venta) => {
        let msg = `*B J IMPORTACIONES CHICLAYO* 💎%0A`;
        msg += `*COMPROBANTE DE VENTA*%0A`;
        msg += `----------------------------%0A`;
        msg += `👤 Cliente: ${venta.cliente_nombre}%0A`;
        msg += `📍 Ciudad: ${venta.localidad}%0A`;
        msg += `🕒 Hora: ${venta.hora}%0A`;
        msg += `----------------------------%0A`;
        
        venta.items.forEach(it => {
            msg += `• ${it.cantidad}x ${it.nombre} (${it.color}) - S/ ${(it.cantidad * it.precio_venta_unitario).toFixed(2)}%0A`;
        });
        
        msg += `----------------------------%0A`;
        msg += `*TOTAL PAGADO: S/ ${venta.total.toFixed(2)}*%0A%0A`;
        msg += `¡Gracias por tu confianza! 🚀`;

        // Usamos el teléfono que viene en la venta o pedimos uno si no existe
        const nro = venta.telefono || telefono || "";
        window.open(`https://wa.me/51${nro}?text=${msg}`, '_blank');
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
            {/* 5. CORTINA DE HUMO */}
            {isProcessing && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
                    <h2 style={{ fontWeight: '900', letterSpacing: '2px', margin: 0 }}>PROCESANDO...</h2>
                    <p style={{ opacity: 0.8 }}>Asegurando transacción en el Búnker</p>
                </div>
            )}
            {showSuccess && (
                <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: VERDE_BJ, color: '#fff', padding: '18px 40px', borderRadius: '30px', fontWeight: '900', boxShadow: `0 15px 40px ${VERDE_BJ}50`, zIndex: 9999, animation: 'slideDown 0.4s ease-out', fontSize: '16px', letterSpacing: '1px' }}>
                    ✅ VENTA REGISTRADA
                </div>
            )}

            {/* --- BLOQUE 1: DASHBOARD DE MÉTRICAS PREMIUM --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', fontFamily: "'Poppins', sans-serif" }}>
                
                {/* TARJETA CAJA */}
                <div style={{ ...styleCrd, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: `8px solid ${AMARILLO_BJ}` }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: `${AMARILLO_BJ}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                        💵
                    </div>
                    <div>
                        <small style={{ fontWeight: '600', opacity: 0.4, fontSize: '11px', letterSpacing: '1px' }}>CAJA FÍSICA HOY</small>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: OSCURO_BJ }}>
                            S/ {(balanceEliteBJ?.cH || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                        </div>
                    </div>
                </div>

                {/* TARJETA GANANCIA */}
                <div style={{ ...styleCrd, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: `8px solid ${VERDE_BJ}` }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: `${VERDE_BJ}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                        📈
                    </div>
                    <div>
                        <small style={{ fontWeight: '600', opacity: 0.4, fontSize: '11px', letterSpacing: '1px' }}>GANANCIA NETA</small>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: VERDE_BJ }}>
                            S/ {(balanceEliteBJ?.gH || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                        </div>
                    </div>
                </div>

                {/* TARJETA STOCK */}
                <div style={{ ...styleCrd, display: 'flex', alignItems: 'center', gap: '20px', borderLeft: `8px solid ${OSCURO_BJ}`, background: '#1E1B1C', color: '#fff' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                        📦
                    </div>
                    <div>
                        <small style={{ fontWeight: '600', opacity: 0.5, fontSize: '11px', letterSpacing: '1px' }}>STOCK ALMACÉN</small>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>
                            {stockTotalUnidades} <span style={{ fontSize: '14px', opacity: 0.6 }}>und.</span>
                        </div>
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

                        <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '5px' }}>
                            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0).map(p => {
                                
                                // --- 1. LÓGICA DE AUTOCOMPLETADO DE PRECIOS (EL CEREBRO) ---
                                const pMayor = Number(p.precio_venta || 0);
                                const pMenor = Number(p.precio_menor || 0);
                                const precioFinal = tipoVenta === 'Mayor' 
                                    ? (pMayor > 0 ? pMayor : pMenor) 
                                    : (pMenor > 0 ? pMenor : pMayor);

                                // --- 2. RENDERIZADO VISUAL CON MEJORAS ---
                                return (
                                    <div key={p.id} style={{ 
                                        padding: '20px', borderRadius: '25px', border: '1px solid #F1F5F9', backgroundColor: '#fff',
                                        transform: animatingId === p.id ? 'scale(0.95)' : 'scale(1)', // EFECTO TAP VISUAL
                                        transition: 'transform 0.15s ease' 
                                    }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            {/* AVATAR DE PRODUCTO */}
                                            <div style={{ width: '45px', height: '45px', borderRadius: '12px', backgroundColor: `${FUCSIA_PRINCIPAL}15`, color: FUCSIA_PRINCIPAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px', flexShrink: 0 }}>
                                                {p.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <strong style={{ fontSize: '15px', lineHeight: '1.2', display: 'block', marginBottom: '4px' }}>{p.nombre}</strong>
                                                {/* SEMÁFORO DE STOCK VISUAL */}
                                                <small style={{ color: p.stock > 10 ? VERDE_BJ : (p.stock > 0 ? AMARILLO_BJ : ROJO_BJ), fontWeight: '900' }}>
                                                    {p.stock > 10 ? '🟢 ' : (p.stock > 0 ? '🟠 ' : '🔴 ')} Stock: {p.stock}u | S/ {precioFinal.toFixed(2)}
                                                </small>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.6fr', gap: '10px', marginTop: '15px' }}>
                                            <select value={coloresElegidos[p.id] || 'Único'} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...styleInp, padding: '10px', fontSize: '12px' }}>
                                                {p.colores?.split(',').map((c, idx) => <option key={idx} value={c.trim()}>{c.trim()}</option>) || <option>Único</option>}
                                            </select>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => modCant(p.id, -1)} style={{ width: '35px', height: '35px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900' }}>-</button>
                                                <span style={{ fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                                <button onClick={() => modCant(p.id, 1)} style={{ width: '35px', height: '35px', borderRadius: '10px', border: 'none', backgroundColor: '#F1F5F9', fontWeight: '900' }}>+</button>
                                            </div>
                                            {/* LANZADOR DEL EFECTO TAP */}
                                            <button onClick={() => {
                                                setAnimatingId(p.id);
                                                setTimeout(() => setAnimatingId(null), 150); // Apaga la animación en 150ms
                                                setCarrito([...carrito, { 
                                                    producto_id: p.id, nombre: p.nombre, cantidad: Number(cantidades[p.id] || 1), color: coloresElegidos[p.id] || p.colores?.split(',')[0].trim() || 'Único', precio_venta: precioFinal, precio_compra: p.precio_compra 
                                                }]);
                                            }} style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', height: '45px', borderRadius: '15px', fontWeight: '900', fontSize: '20px', cursor: 'pointer', opacity: p.stock > 0 ? 1 : 0.5 }} disabled={p.stock <= 0}>+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- BLOQUE 3: CARRITO MÁSTER --- */}
                <div style={{ ...styleCrd, position: 'sticky', top: '80px', alignSelf: 'start', height: 'fit-content', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                    <h3 style={{ marginTop: 0, color: VERDE_BJ, fontWeight: '900', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, paddingBottom: '10px' }}>🛒 Carrito</h3>
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
                                    <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
    <button 
        onClick={() => { setEfectivoRecibido(totalCarrito); setEsCredito(false); }}
        style={{ flex: 1, padding: '10px', background: OSCURO_BJ, color: '#fff', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
    >💵 TODO CASH</button>

    <button 
        onClick={() => { setEfectivoRecibido(0); setEsCredito(false); }}
        style={{ flex: 1, padding: '10px', background: '#73029c', color: '#fff', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
    >📱 TODO YAPE</button>
    
    <button 
        onClick={() => setEsCredito(!esCredito)}
        style={{ flex: 1, padding: '10px', background: esCredito ? AMARILLO_BJ : '#f1f1f1', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
    >💳 {esCredito ? 'ES CRÉDITO' : 'A CRÉDITO?'}</button>
</div>

       {/* Indicador visual de Yape o Saldo */}
{montoYape > 0 && carrito.length > 0 && <div style={{ color: '#0369A1', fontWeight: '900', fontSize: '12px' }}>📱 Diferencia por Yape: S/ {montoYape.toFixed(2)}</div>}
{esCredito && <div style={{ color: ROJO_BJ, fontWeight: '900', fontSize: '12px' }}>📝 Saldo por Cobrar: S/ {saldoPendiente.toFixed(2)}</div>}
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
    {/* Botón Cash: Procesa la venta asumiendo que el resto es Yape si no completaste el total */}
    <button 
        onClick={() => ejecutarVentaConAlerta('Entregado')} 
        style={{ backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${VERDE_BJ}40` }}
    >VENTA CASH 💵</button>

    <button 
        onClick={() => ejecutarVentaConAlerta('En Almacén')} 
        style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${AMARILLO_BJ}40` }}
    >ALMACÉN 📦</button>

    {/* FIX CRÍTICO: Aquí ya NO pasamos 'efectivoRecibido'. La función lo toma sola del estado */}
    <button 
        onClick={() => ejecutarVentaConAlerta('Pendiente de Pago')} 
        style={{ backgroundColor: ROJO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px ${ROJO_BJ}40` }}
    >A CRÉDITO 💳</button>

    <button 
        onClick={handleWhatsApp} 
        style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: `0 8px 20px #25D36640` }}
    >WHATSAPP 📱</button>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '900' }}>{g.cliente_nombre}</span>
                                    <small style={{ opacity: 0.5 }}>📍 {g.localidad} • 🕒 {g.hora}</small>

                                    {/* ETIQUETAS DE PAGO MEJORADAS */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {/* ETIQUETA: EFECTIVO */}
                                        {Number(g.items[0]?.monto_efectivo || 0) > 0 && (
                                            <span style={{ background: '#DCFCE7', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#166534', border: '1px solid #16653430' }}>
                                                💵 EFECTIVO: S/ {Number(g.items[0].monto_efectivo).toFixed(2)}
                                            </span>
                                        )}

                                        {/* ETIQUETA: YAPE / PLIN */}
                                        {Number(g.items[0]?.monto_yape || 0) > 0 && (
                                            <span style={{ background: '#F0E7FF', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#6B21A8', border: '1px solid #6B21A830' }}>
                                                📱 YAPE: S/ {Number(g.items[0].monto_yape).toFixed(2)}
                                            </span>
                                        )}

                                        {/* ETIQUETA: CRÉDITO / DEUDA */}
                                        {Number(g.items[0]?.saldo_pendiente || 0) > 0 && (
                                            <span style={{ background: '#FFE4E6', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#9F1239', border: '1px solid #9F123930' }}>
                                                💳 CRÉDITO: S/ {Number(g.items[0].saldo_pendiente).toFixed(2)}
                                            </span>
                                        )}
                                        
                                        {/* INDICADOR DE PAGO TOTAL O PARCIAL */}
                                        {Number(g.items[0]?.saldo_pendiente || 0) === 0 ? (
                                            <span style={{ background: '#F1F5F9', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#475569' }}>✅ PAGADO</span>
                                        ) : (
                                            <span style={{ background: AMARILLO_BJ, padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#fff' }}>⏳ PENDIENTE</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ color: FUCSIA_PRINCIPAL, fontSize: '1.6rem', fontWeight: '900' }}>S/ {g.total.toFixed(2)}</span>
                                    <button onClick={() => enviarComprobanteWA_Historial(g)} style={{ border: 'none', background: '#25D36620', color: '#25D366', borderRadius: '12px', padding: '10px', cursor: 'pointer', fontSize: '20px' }}>📲</button>
                                </div>
                            </div>

                            {/* LISTA DE ITEMS */}
                            <div style={{ borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                                {g.items.map((it, idx) => {
    // Buscamos el producto comparando los IDs como Strings para evitar errores de tipo
    const pEncontrado = productos.find(p => String(p.id) === String(it.producto_id));
    const nombreReal = pEncontrado ? pEncontrado.nombre : "Modelo";

    return (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0' }}>
            <span>{it.cantidad}x <strong>{nombreReal}</strong> <small style={{ opacity: 0.5 }}>({it.color})</small></span>
            <div style={{ display: 'flex', gap: '15px' }}>
                <span style={{ fontWeight: '900' }}>S/ {(it.cantidad * it.precio_venta_unitario).toFixed(2)}</span>
                <button title="Editar" onClick={() => { setIdEditItemHistorial(it.id); setFormEditItemHistorial({ cantidad: it.cantidad, precio_venta_unitario: it.precio_venta_unitario }); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                <button title="Eliminar" onClick={() => handleAnularVentaBJ(it)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}