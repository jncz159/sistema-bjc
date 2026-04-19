"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v107.0 - EXPERIENCE PRO)
 * MEJORAS: Filtros Tácticos + Salud de Stock + Feedback Visual + Resumen Flotante
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { getHoraPeru, handleInputMonto, getEtiquetaProducto } from '../lib/helpers';

export default function VentasSection({ 
    balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull, 
    tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas, 
    localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, 
    descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, 
    productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, 
    busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ,
    analiticaProBJ, // Recibimos el top 5 para el filtro inteligente
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
}) {

    // --- ESTADOS LOCALES ---
    const [pagoCon, setPagoCon] = useState('');
    const [abonoInicial, setAbonoInicial] = useState('0');
    const [filtroActivo, setFiltroActivo] = useState('todos'); // todos, top, nuevos, bajo_stock
    const [feedback, setFeedback] = useState({}); // Para el efecto "AÑADIDO ✅"

    const subtotalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const totalFinal = subtotalCarrito - Number(descuento);
    const vueltoCalculado = Number(pagoCon) > 0 ? (Number(pagoCon) - totalFinal) : 0;

    // --- LÓGICA DE FILTRADO ---
    const productosFiltrados = productos?.filter(p => {
        const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase());
        if (!matchBusqueda) return false;

        if (filtroActivo === 'top') {
            const nombresTop = analiticaProBJ?.top?.map(t => t[0]) || [];
            return nombresTop.includes(p.nombre);
        }
        if (filtroActivo === 'nuevos') return !!getEtiquetaProducto(p.created_at);
        if (filtroActivo === 'bajo_stock') return p.stock < 6;
        
        return true;
    });

    // --- MANEJADORES ---
    const triggerFeedback = (id) => {
        setFeedback(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setFeedback(prev => ({ ...prev, [id]: false })), 1000);
    };

    const handleTicketPreliminar = () => {
        if (!cliente) return alert("Ingresa nombre del cliente.");
        let msg = `*COTIZACIÓN PRELIMINAR - BJ IMPORTACIONES*%0A%0A*Cliente:* ${cliente}%0A%0A*Detalle:*%0A`;
        carrito.forEach(i => { msg += `- *${i.cantidad}x* ${i.nombre} (${i.color}): S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`; });
        if (Number(descuento) > 0) msg += `%0A*Descuento:* - S/ ${Number(descuento).toFixed(2)}`;
        msg += `%0A%0A*TOTAL: S/ ${totalFinal.toFixed(2)}*%0A%0A_Válido solo por hoy._`;
        window.open(`https://wa.me/51${telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', paddingBottom: carrito.length > 0 ? '100px' : '0' }}>
            
            {/* CABECERA FINANCIERA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ?.cH?.toFixed(2) || "0.00"}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900' }}>Utilidad: S/ {balanceEliteBJ?.gH?.toFixed(2) || "0.00"}</div>
              </div>
              <div style={styleCrd}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR DÍA BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, marginTop: '15px' }} />
              </div>
            </div>

            {/* CARRITO Y REGISTRO (Sección Central) */}
            <div id="seccion-carrito" style={{ ...styleCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: '0 0 25px 0', color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Operación Chiclayo</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_mod" placeholder="👤 Cliente" value={cliente} onChange={handleAutocompleteCliente} style={styleInp} />
                <datalist id="clis_mod">
                    {ventas?.length > 0 && [...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                </datalist>
                <input placeholder="📍 Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={styleInp} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={styleInp} />
                
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', flex:1, padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYORISTA</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', flex:1, padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>

              {carrito?.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL }}>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px', marginTop: '30px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: `1px solid ${VERDE_BJ}40` }}>
                        <small style={{ fontWeight: '900', opacity: 0.6 }}>CALCULADORA DE VUELTO:</small>
                        <input type="text" placeholder="Paga con S/..." value={pagoCon} onChange={e => setPagoCon(handleInputMonto(e.target.value))} style={{ ...styleInp, marginTop: '5px', height: '45px', border: `2px solid ${VERDE_BJ}` }} />
                        {vueltoCalculado > 0 && <div style={{ marginTop: '10px', color: VERDE_BJ, fontWeight: '900', fontSize:'1.3rem' }}>VUELTO: S/ {vueltoCalculado.toFixed(2)}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '100px', padding: '10px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900' }} />
                        <h3 style={{ margin: '10px 0', fontSize: '3rem', fontWeight: '900' }}>Total: S/ {totalFinal.toFixed(2)}</h3>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '25px' }}>
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>✅ CONFIRMAR VENTA</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>📦 PARA RECOJO</button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="text" placeholder="Abono S/" value={abonoInicial} onChange={e => setAbonoInicial(handleInputMonto(e.target.value))} style={{...styleInp, height:'40px', textAlign:'center', border:`2px solid ${AMARILLO_BJ}`}} />
                        <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago', abonoInicial)} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💸 CRÉDITO</button>
                    </div>
                    <button onClick={handleTicketPreliminar} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>📄 ENVIAR TICKET</button>
                  </div>
                </div>
              )}

              {/* BARRA DE BÚSQUEDA Y CHIPS DE FILTRO */}
              <div style={{ position: 'sticky', top: '70px', zIndex: 50, background: '#fff', paddingTop: '10px' }}>
                <input placeholder="🔍 Buscar por nombre de modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...styleInp, height: '65px', border:`2px solid ${FUCSIA_PRINCIPAL}30`, fontSize:'1.1rem' }} />
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                    <button onClick={() => setFiltroActivo('todos')} style={{ border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: filtroActivo === 'todos' ? FUCSIA_PRINCIPAL : '#F1F5F9', color: filtroActivo === 'todos' ? '#fff' : '#64748B' }}>TODOS</button>
                    <button onClick={() => setFiltroActivo('top')} style={{ border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: filtroActivo === 'top' ? '#FFD700' : '#F1F5F9', color: filtroActivo === 'top' ? '#000' : '#64748B' }}>🔥 MÁS VENDIDOS</button>
                    <button onClick={() => setFiltroActivo('nuevos')} style={{ border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: filtroActivo === 'nuevos' ? '#9333EA' : '#F1F5F9', color: filtroActivo === 'nuevos' ? '#fff' : '#64748B' }}>✨ NOVEDADES</button>
                    <button onClick={() => setFiltroActivo('bajo_stock')} style={{ border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: filtroActivo === 'bajo_stock' ? ROJO_BJ : '#F1F5F9', color: filtroActivo === 'bajo_stock' ? '#fff' : '#64748B' }}>⚠️ POR AGOTAR</button>
                </div>
              </div>

              {/* GRILLA DE PRODUCTOS MEJORADA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginTop: '20px', maxHeight: '800px', overflowY: 'auto', padding:'5px' }}>
                {productosFiltrados?.map((p) => {
                    const tagBJ = getEtiquetaProducto(p.created_at);
                    const precioActual = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                    const esBajoStock = p.stock < 6;
                    const stockPct = Math.min((p.stock / 20) * 100, 100); // Base 20 unidades para la barra visual

                    return (
                        <div key={p.id} style={{ 
                            border: esBajoStock ? `2px solid ${ROJO_BJ}30` : '1px solid #F1F5F9', 
                            padding: '25px', borderRadius: '35px', position: 'relative', backgroundColor:'#fff', 
                            transition: '0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' 
                        }}>
                            {tagBJ && <span style={{ position:'absolute', top: '-10px', left: '20px', backgroundColor: tagBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 2 }}>{tagBJ.tipo}</span>}
                            
                            <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '1.05rem', lineHeight: '1.2' }}>{p.nombre}</strong>
                            
                            {/* BARRA DE SALUD DE STOCK */}
                            <div style={{ margin: '15px 0 5px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', marginBottom: '5px' }}>
                                    <span style={{ color: esBajoStock ? ROJO_BJ : '#64748B' }}>DISPONIBLE:</span>
                                    <span style={{ color: esBajoStock ? ROJO_BJ : VERDE_BJ }}>{p.stock} UNIDADES</span>
                                </div>
                                <div style={{ height: '6px', width: '100%', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', width: `${stockPct}%`, 
                                        background: p.stock < 5 ? ROJO_BJ : (p.stock < 10 ? AMARILLO_BJ : VERDE_BJ),
                                        transition: '0.5s'
                                    }}></div>
                                </div>
                            </div>

                            {/* SELECTOR DE COLORES Y CANTIDAD */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', margin: '15px 0' }}>
                                <select value={coloresElegidos[p.id] || ""} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{...styleInp, padding:'8px', fontSize:'12px', border: `1px solid ${OSCURO_BJ}20` }}>
                                    <option value="">Color...</option>
                                    {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', borderRadius: '12px', padding: '0 8px' }}>
                                    <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: 'none', width: '25px', cursor: 'pointer', fontWeight: '900' }}>-</button>
                                    <span style={{ flex: 1, textAlign: 'center', fontWeight: '900', fontSize: '14px' }}>{cantidades[p.id] || 1}</span>
                                    <button onClick={() => setCantidades({...cantidades, [p.id]: (cantidades[p.id] || 1) + 1})} style={{ border: 'none', background: 'none', width: '25px', cursor: 'pointer', fontWeight: '900' }}>+</button>
                                </div>
                            </div>

                            {/* PRECIO DINÁMICO */}
                            <button 
                                onClick={() => {
                                    const cE = Number(cantidades[p.id] || 1);
                                    const clE = coloresElegidos[p.id] || p.colores?.split(',')[0]?.trim() || "Único";
                                    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cE, color: clE, precio_venta: precioActual, precio_compra: p.precio_compra }]);
                                    triggerFeedback(p.id);
                                }} 
                                disabled={p.stock <= 0}
                                style={{ 
                                    width: '100%', 
                                    backgroundColor: feedback[p.id] ? VERDE_BJ : (tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : OSCURO_BJ), 
                                    color: '#fff', border: 'none', padding: '15px', borderRadius: '20px', 
                                    fontSize: '13px', fontWeight: '900', cursor:'pointer', transition: '0.3s' 
                                }}
                            >
                                {feedback[p.id] ? 'AÑADIDO ✅' : `S/ ${Number(precioActual).toFixed(2)}`}
                            </button>
                        </div>
                    );
                })}
              </div>
            </div>

            {/* HISTORIAL BJ */}
            <div style={styleCrd}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial BJ Chiclayo</h4>
                <input placeholder="🔍 Filtrar historial..." value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} style={{...styleInp, marginBottom:'25px' }} />
                {historialVentasDiaBJ?.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ {grupo.hora}</small>
                                <br/><strong style={{ color: OSCURO_BJ, fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => {
                                    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de *BJ Importaciones Chiclayo*.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        const pNom = productos?.find(p => p.id === v.producto_id)?.nombre || "Item";
                                        msg += `- *${v.cantidad}x* ${pNom} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias! 😊`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
                                }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'20px', background:'rgba(255,255,255,0.5)', padding:'15px', borderRadius:'20px'}}>
                            {grupo.items.map(v => (
                                <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #FFF1F2'}}>
                                    <div>
                                        <small style={{fontWeight:'900'}}>{v.cantidad}x</small> <span>{productos?.find(p=>p.id===v.producto_id)?.nombre}</span>
                                        <br/><small style={{color:FUCSIA_PRINCIPAL}}>{v.color}</small> | <span style={{fontSize:'10px', color: v.estado_pedido === 'Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido?.toUpperCase()}</span>
                                    </div>
                                    <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:`${ROJO_BJ}15`, color:ROJO_BJ, width:'30px', height:'30px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- BARRA FLOTANTE DE COBRO (NUEVA v107) --- */}
            {carrito.length > 0 && (
                <div style={{ 
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', 
                    width: '90%', maxWidth: '800px', backgroundColor: OSCURO_BJ, color: '#fff', 
                    padding: '20px 35px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', 
                    alignItems: 'center', boxShadow: '0 15px 40px rgba(0,0,0,0.4)', zIndex: 1000 
                }}>
                    <div>
                        <small style={{ opacity: 0.7, fontWeight: '900' }}>CARRITO: {carrito.length} ÍTEMS</small>
                        <h4 style={{ margin: 0, fontSize: '1.6rem' }}>Total: S/ {totalFinal.toFixed(2)}</h4>
                    </div>
                    <button 
                        onClick={() => document.getElementById('seccion-carrito').scrollIntoView({ behavior: 'smooth' })}
                        style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}
                    >
                        💰 COBRAR AHORA
                    </button>
                </div>
            )}
        </div>
    );
}