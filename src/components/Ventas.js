"use client";
/**
 * ============================================================================
 * COMPONENTE: Ventas.js (v105.1 - UPGRADE OPERATIVO)
 * MEJORAS: WhatsApp Restaurado + Calculadora de Vuelto + Ticket Preliminar
 * ============================================================================
 */
import React, { useState } from 'react';
import { getHoraPeru, handleInputMonto, getEtiquetaProducto } from '../lib/helpers';

export default function VentasSection({ 
    balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull, 
    tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas, 
    localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, 
    descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, 
    productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, 
    busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ,
    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
}) {

    // ESTADO LOCAL PARA CALCULADORA (Solo orientativo, no se guarda)
    const [pagoCon, setPagoCon] = useState('');

    const subtotalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const totalFinal = subtotalCarrito - Number(descuento);
    const vueltoCalculado = Number(pagoCon) > 0 ? (Number(pagoCon) - totalFinal) : 0;

    // FUNCIÓN PARA TICKET PRELIMINAR (Antes de registrar la venta)
    const handleTicketPreliminar = () => {
        if (!cliente) return alert("Por favor, ingresa el nombre del cliente.");
        if (carrito.length === 0) return alert("El carrito está vacío.");

        let msg = `*COTIZACIÓN PRELIMINAR - BJ IMPORTACIONES* 📑%0A%0A`;
        msg += `*Cliente:* ${cliente}%0A`;
        msg += `*Estado:* Pendiente de confirmación%0A%0A`;
        msg += `*Detalle:*%0A`;
        
        carrito.forEach(item => {
            msg += `- ${item.cantidad}x ${item.nombre} (${item.color}): S/ ${(item.precio_venta * item.cantidad).toFixed(2)}%0A`;
        });

        if (Number(descuento) > 0) {
            msg += `%0A*Subtotal:* S/ ${subtotalCarrito.toFixed(2)}`;
            msg += `%0A*Descuento:* - S/ ${Number(descuento).toFixed(2)}`;
        }

        msg += `%0A%0A*TOTAL A PAGAR: S/ ${totalFinal.toFixed(2)}*%0A%0A`;
        msg += `_Este es un ticket de control previo._`;

        window.open(`https://wa.me/51${telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            {/* CABECERA DE CAJA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ?.cH?.toFixed(2) || "0.00"}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900' }}>Utilidad estimada: S/ {balanceEliteBJ?.gH?.toFixed(2) || "0.00"}</div>
              </div>
              <div style={styleCrd}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR DÍA BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, marginTop: '15px' }} />
              </div>
            </div>

            {/* FORMULARIO DE VENTA */}
            <div style={{ ...styleCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: '0 0 25px 0', color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Operación</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_mod" placeholder="👤 Cliente" value={cliente} onChange={handleAutocompleteCliente} style={styleInp} />
                <datalist id="clis_mod">
                    {ventas?.length > 0 && [...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}
                </datalist>
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={styleInp} />
                {/* CAMPO DE WHATSAPP RESTAURADO */}
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={styleInp} />
                
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', flex:1, padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', flex:1, padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MENOR</button>
                </div>
              </div>

              {/* CARRITO Y CALCULADORA */}
              {carrito?.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  <h4 style={{marginTop: 0, color: FUCSIA_PRINCIPAL}}>Resumen de Carrito:</h4>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL }}>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
                    {/* CALCULADORA DE VUELTO */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #FCC2E2' }}>
                        <small style={{ fontWeight: '900', opacity: 0.6 }}>EFECTIVO RECIBIDO:</small>
                        <input type="text" placeholder="S/ 0.00" value={pagoCon} onChange={e => setPagoCon(handleInputMonto(e.target.value))} style={{ ...styleInp, marginTop: '5px', height: '45px', border: `1px solid ${VERDE_BJ}` }} />
                        {vueltoCalculado > 0 && (
                            <div style={{ marginTop: '10px', color: VERDE_BJ, fontWeight: '900' }}>VUELTO: S/ {vueltoCalculado.toFixed(2)}</div>
                        )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900' }}>DESCUENTO S/ </span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '100px', padding: '10px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900' }} />
                        <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {totalFinal.toFixed(2)}</h3>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginTop: '20px' }}>
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>✅ CONFIRMAR</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>📦 ALMACÉN</button>
                    <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>💸 CRÉDITO</button>
                    <button onClick={handleTicketPreliminar} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>📄 PRE-TICKET</button>
                  </div>
                </div>
              )}

              {/* LISTA DE PRODUCTOS */}
              <input placeholder="🔍 Buscar modelo para añadir..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...styleInp, marginBottom: '25px', height: '60px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '600px', overflowY: 'auto' }}>
                {productos?.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tagBJ = getEtiquetaProducto(p.created_at);
                  const pSh = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: Number(p.stock) < 5 ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', position: 'relative', backgroundColor:'#fff' }}>
                        {tagBJ && <span style={{ position:'absolute', top: '-10px', left: '20px', backgroundColor: tagBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900' }}>{tagBJ.tipo}</span>}
                        <strong style={{ display: 'block', height: '40px', overflow: 'hidden' }}>{p.nombre}</strong>
                        <div style={{ color: Number(p.stock) < 5 ? ROJO_BJ : VERDE_BJ, fontWeight: '900', margin: '10px 0', textAlign:'center' }}>STOCK: {p.stock} U.</div>
                        <div style={{ marginBottom: '15px' }}>
                            <select value={coloresElegidos[p.id] || ""} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{...styleInp, padding:'8px', fontSize:'13px', marginBottom:'10px'}}>
                                <option value="">Seleccionar Color</option>
                                {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                            </select>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f1f1f1', borderRadius: '10px', width: '35px', height: '35px', cursor:'pointer' }}>-</button>
                                <span style={{ fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f1f1f1', borderRadius: '10px', width: '35px', height: '35px', cursor:'pointer' }}>+</button>
                            </div>
                        </div>
                        <button onClick={() => {
                            const cE = Number(cantidades[p.id] || 1);
                            const clE = coloresElegidos[p.id] || p.colores?.split(',')[0]?.trim() || "Único";
                            setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cE, color: clE, precio_venta: pSh, precio_compra: p.precio_compra }]);
                        }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '15px', borderRadius: '22px', fontSize: '13px', fontWeight: '900', cursor:'pointer' }}>
                            AÑADIR S/ {Number(pSh).toFixed(2)}
                        </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL FILTRADO */}
            <div style={styleCrd}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones BJ</h4>
                <input placeholder="🔍 Filtrar historial..." value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} style={{...styleInp, marginBottom:'25px', border:`1px solid ${FUCSIA_PRINCIPAL}30` }} />
                
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
                                    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de *BJ Importaciones*.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        const pNom = productos?.find(p => p.id === v.producto_id)?.nombre || "Item";
                                        msg += `- *${v.cantidad}x* ${pNom} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msg += `%0A*TOTAL: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias! 😊`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
                                }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos?.find(p=>p.id===v.producto_id)?.nombre} ({v.color}) | <span style={{color: v.estado_pedido === 'Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido}</span></small></div>
                                <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}