"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  // --- UTILS: GARANTIZAR HORA PERÚ (GMT-5) ---
  const getFechaPeru = (dateInput = new Date()) => {
    // Forzamos el uso de la zona horaria de Lima para obtener la fecha exacta
    const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
    const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(new Date(dateInput));
    const fechaReal = partes.find(p => p.type === 'year').value + '-' +
                    partes.find(p => p.type === 'month').value + '-' +
                    partes.find(p => p.type === 'day').value;
    return fechaReal;
  };

  // --- ESTADOS ---
  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Sincronizamos la fecha inicial con el reloj real de Chiclayo
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  
  // ESTADOS PARA EDITAR FINANZAS (LIBRO DIARIO)
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: 0 });
  
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';
  const COLORS = ['#F786C1', '#FCA5D4', '#FCC2E2', '#ED64A6', '#C64F8C', '#A13C6D'];

  useEffect(() => {
    document.title = "B J Importaciones | Gestión";
    cargarTodo();
    const canal = supabase.channel('bj-realtime-final')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cargarTodo = async () => {
    const { data: p } = await supabase.from('productos').select('*').order('nombre');
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
    const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
    if (p) {
        setProductos(p);
        const cants = {}; const cols = {};
        p.forEach(prod => { 
            cants[prod.id] = 1; 
            cols[prod.id] = prod.colores?.split(',')[0].trim() || 'N/A'; 
        });
        setCantidades(prev => ({ ...cants, ...prev }));
        setColoresElegidos(prev => ({ ...cols, ...prev }));
    }
    if (v) setVentas(v);
    if (f) setFinanzas(f);
  };

  // --- LÓGICA DE NEGOCIO ---
  const clientesUnicos = useMemo(() => [...new Set(ventas.map(v => v.cliente_nombre))].filter(Boolean), [ventas]);

  const handleClienteChange = (e) => {
    const nom = e.target.value; setCliente(nom);
    const c = ventas.find(v => v.cliente_nombre.toLowerCase() === nom.toLowerCase());
    if (c) { setLocalidad(c.localidad || ''); setTelefono(c.telefono || ''); }
  };

  const ventasDelDiaOAlmacen = useMemo(() => {
    return ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta || v.estado_pedido === 'En Almacén');
  }, [ventas, fechaConsulta]);
  
  const ventasAgrupadas = useMemo(() => {
    const grupos = {};
    ventasDelDiaOAlmacen.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) grupos[key] = { id_principal: v.id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      grupos[key].items.push(v);
      grupos[key].total += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos).reverse();
  }, [ventasDelDiaOAlmacen]);

  const totalesDia = useMemo(() => {
    const hoyPeru = getFechaPeru();
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoyPeru);
    return { 
      caja: vHoy.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
      ganancia: vHoy.reduce((acc, v) => acc + v.ganancia_total, 0)
    };
  }, [ventas]);

  const resumenFinanciero = useMemo(() => {
    const g = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Compra Stock' || f.tipo === 'Retiro Ganancias').reduce((acc, f) => acc + f.monto, 0);
    const e = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión').reduce((acc, f) => acc + f.monto, 0);
    const gn = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    const br = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    return { gastos: g, extras: e, gananciaVentas: gn, cajaActual: br + e - g };
  }, [finanzas, ventas]);

  const valorInventario = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p.stock > 0) { c += (p.precio_compra * p.stock); v += (p.precio_venta * p.stock); } });
    return [ { nombre: 'Costo', valor: c, fill: '#1E1B1C' }, { nombre: 'Venta', valor: v, fill: FUCSIA_PRINCIPAL } ];
  }, [productos]);

  // --- ACCIONES VENTAS ---
  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const color = coloresElegidos[p.id];
    const enc = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if (p.stock < cant + enc) return alert(`Stock insuficiente.`);
    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cant, color: color, precio_venta: p.precio_venta, precio_compra: p.precio_compra }]);
  };

  const finalizarVentaLote = async (estado = 'Entregado', conWA = false) => {
    if (!cliente || !localidad) return alert("Faltan datos.");
    const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0);
    const ratioDesc = totalCarrito > 0 ? (descuento / totalCarrito) : 0;
    const inserts = carrito.map(i => {
      const itemBruto = i.precio_venta * i.cantidad;
      const descItem = itemBruto * ratioDesc;
      return { cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, precio_costo_unitario: i.precio_compra, ganancia_total: ((i.precio_venta - i.precio_compra) * i.cantidad) - descItem, estado_pedido: estado };
    });
    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const i of carrito) {
        const pr = productos.find(p => p.id === i.producto_id);
        await supabase.from('productos').update({ stock: pr.stock - i.cantidad }).eq('id', i.producto_id);
      }
      if (conWA && telefono) {
        let m = `¡Hola *${cliente}*! 👋 Ticket B J Importaciones.%0A%0A${estado==='En Almacén'?'📦 *ESTADO:* En Almacén%0A':''}`;
        carrito.forEach(i => { m += `- ${i.cantidad}x ${i.nombre} (${i.color}): S/ ${(i.precio_venta * i.cantidad).toFixed(2)}%0A`; });
        if(descuento>0) m += `%0A📉 Descuento: - S/ ${descuento.toFixed(2)}`;
        m += `%0A%0A*TOTAL FINAL: S/ ${(totalCarrito - descuento).toFixed(2)}*%0A¡Gracias! 😊`;
        window.open(`https://wa.me/51${telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
    }
  };

  // --- ACCIONES GESTIÓN (LIBRO DIARIO) ---
  const registrarFinanzas = async (e) => {
    e.preventDefault();
    await supabase.from('finanzas').insert([formFinanzas]);
    setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  };

  const prepararEdicionFinanza = (f) => {
    setIdFinanzaEditando(f.id);
    setFormEditFinanza({ tipo: f.tipo, descripcion: f.descripcion, monto: f.monto });
  };

  const guardarCambiosFinanza = async () => {
    const { error } = await supabase.from('finanzas').update({
      tipo: formEditFinanza.tipo,
      descripcion: formEditFinanza.descripcion,
      monto: formEditFinanza.monto
    }).eq('id', idFinanzaEditando);
    
    if (!error) {
      setIdFinanzaEditando(null);
      alert("Registro actualizado correctamente.");
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  const borrarFinanza = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este registro del libro diario?")) {
      await supabase.from('finanzas').delete().eq('id', id);
    }
  };

  const guardarNuevoStock = async (p) => {
    const ns = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: ns }).eq('id', p.id);
    alert("Stock Sincronizado");
  };

  const marcarComoEntregado = async (id) => {
    if (confirm("¿Confirmas la entrega?")) await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id);
  };

  const borrarVenta = async (v) => {
    if (confirm("¿Anular esta venta? El stock regresará.")) {
      const p = productos.find(pr => pr.id === v.producto_id);
      if (p) await supabase.from('productos').update({ stock: p.stock + v.cantidad }).eq('id', p.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  const guardarCambiosVenta = async () => {
    const vOrig = ventas.find(v => v.id === idVentaEditando);
    const pr = productos.find(p => p.id === formEditVenta.producto_id);
    const dif = formEditVenta.cantidad - vOrig.cantidad;
    if (pr.stock < dif) return alert("Sin stock");
    const ng = (formEditVenta.precio_venta_unitario - formEditVenta.precio_costo_unitario) * formEditVenta.cantidad;
    const { error } = await supabase.from('ventas').update({ cliente_nombre: formEditVenta.cliente_nombre, localidad: formEditVenta.localidad, telefono: formEditVenta.telefono, cantidad: formEditVenta.cantidad, color: formEditVenta.color, ganancia_total: ng }).eq('id', idVentaEditando);
    if (!error) {
      await supabase.from('productos').update({ stock: pr.stock - dif }).eq('id', pr.id);
      setIdVentaEditando(null);
    }
  };

  // --- ESTILOS ---
  const glassCard = { backgroundColor: '#ffffff', borderRadius: '20px', padding: '20px', boxShadow: `0 10px 15px -3px ${FUCSIA_PRINCIPAL}10`, border: '1px solid #FFF1F2' };
  const bjInput = { padding: '14px', borderRadius: '12px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 6px -1px ${FUCSIA_PRINCIPAL}20`, flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>BJ</div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h2>
        </div>
        <div style={{ display: 'flex', gap: '5px', backgroundColor: `#FCA5D430`, padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>VENTAS</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>GESTIÓN</button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 15px' }}>
        
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={glassCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '800', fontSize: '12px' }}>CAJA HOY (PERÚ)</span>
                <h2 style={{ margin: '5px 0', fontSize: '2.5rem' }}>S/ {totalesDia.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: 'bold' }}>Ganancia Hoy: S/ {totalesDia.ganancia.toFixed(2)}</div>
              </div>
              <div style={glassCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '800', fontSize: '12px' }}>FECHA CONSULTA</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...bjInput, padding: '8px', marginTop: '5px' }} />
              </div>
            </div>

            <div style={{ ...glassCard, border: `2px solid #FCA5D4` }}>
              <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL }}>Nuevo Pedido</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <input list="c-list" placeholder="👤 Cliente" value={cliente} onChange={handleClienteChange} style={bjInput} />
                <datalist id="c-list">{clientesUnicos.map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF5F7', border: `2px solid ${FUCSIA_PRINCIPAL}`, borderRadius: '16px', padding: '15px', marginBottom: '20px' }}>
                  {carrito.map((i, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #FCC2E2', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span>{i.cantidad}x {i.nombre} <small>({i.color})</small></span>
                      <div><strong>S/ {(i.precio_venta * i.cantidad).toFixed(2)}</strong><button onClick={() => quitarDelCarrito(idx)} style={{ color: FUCSIA_PRINCIPAL, border: 'none', background: 'none', marginLeft: '10px' }}>X</button></div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>DESCUENTO S/ </span>
                    <input type="number" value={descuento} onChange={e=>setDescuento(Number(e.target.value))} style={{ width: '80px', padding: '5px', borderRadius: '8px', border: `1px solid ${FUCSIA_PRINCIPAL}` }} />
                    <h3 style={{ margin: '10px 0' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0) - descuento).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => finalizarVentaLote('Entregado', false)} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}>✅ PAGAR</button>
                    <button onClick={() => finalizarVentaLote('En Almacén', false)} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}>📦 ALMACÉN</button>
                    <button onClick={() => finalizarVentaLote('Entregado', true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', gridColumn: '1/3' }}>📱 WHATSAPP</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, border: `2px solid #FCC2E2`, marginBottom: '20px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                  <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '15px', borderRadius: '18px', backgroundColor: '#fff' }}>
                    <strong style={{ display: 'block', height: '35px', overflow: 'hidden', fontSize: '13px' }}>{p.nombre}</strong>
                    <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '5px', fontSize: '11px', marginBottom: '8px' }}>
                      {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                    </select>
                    <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: p.stock > 0 ? '#1E1B1C' : '#eee', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                      {p.stock > 0 ? `S/ ${p.precio_venta}` : 'AGOTADO'}
                    </button>
                    <small style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: p.stock < 5 ? FUCSIA_PRINCIPAL : '#64748b' }}>Stock: {p.stock}</small>
                  </div>
                ))}
              </div>
            </div>

            <div style={glassCard}>
              <h4 style={{ margin: 0, marginBottom: '20px' }}>Historial y Almacén</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {ventasAgrupadas.map(g => (
                  <div key={g.id_principal} style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '18px', border: `1px solid ${g.items.some(i=>i.estado_pedido==='En Almacén') ? FUCSIA_PRINCIPAL : '#FCC2E2'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{g.cliente_nombre} <small>({g.localidad})</small></strong>
                      <button onClick={() => {
                        let m = `¡Hola *${g.cliente_nombre}*! 👋 Ticket B J Importaciones.%0A%0A`;
                        g.items.forEach(v => { m += `- ${v.cantidad}x ${productos.find(p=>p.id===v.producto_id)?.nombre} (${v.color}): S/ ${(v.precio_venta_unitario*v.cantidad).toFixed(2)}%0A`; });
                        m += `%0A*TOTAL: S/ ${g.total.toFixed(2)}*%0A¡Gracias! 😊`;
                        window.open(`https://wa.me/51${g.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                      }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '8px', fontSize: '11px' }}>📱 Ticket</button>
                    </div>
                    {g.items.map(v => (
                      <div key={v.id} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ fontSize: '12px' }}>{v.cantidad}x {productos.find(p => p.id === v.producto_id)?.nombre} <br/> <small>{v.color} {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : ''}</small></div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                          {v.estado_pedido === 'En Almacén' && <button onClick={() => marcarComoEntregado(v.id)} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10px' }}>ENTREGAR</button>}
                          <button onClick={() => borrarVenta(v)} style={{ border: 'none', background: 'none', color: FUCSIA_PRINCIPAL }}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>Total: S/ {g.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div style={{ ...glassCard, borderLeft: `6px solid ${FUCSIA_PRINCIPAL}` }}><small>GASTOS</small><h4>S/ {resumenFinanciero.gastos.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, borderLeft: '6px solid #16A34A' }}><small>EXTRAS</small><h4>S/ {resumenFinanciero.extras.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, borderLeft: '8px solid #3B82F6' }}><small>GANANCIA NETA</small><h4>S/ {resumenFinanciero.gananciaVentas.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff' }}><small>CAJA ACTUAL</small><h4>S/ {resumenFinanciero.cajaActual.toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL }}>Nuevo Movimiento</h4>
                  <form onSubmit={registrarFinanzas} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}>
                      <option value="Gasto Local">Gasto Local</option>
                      <option value="Compra Stock">Compra Stock</option>
                      <option value="Ingreso Adicional">Ingreso Adicional</option>
                      <option value="Inversión">Inversión Inicial</option>
                      <option value="Retiro Ganancias">Retiro Ganancias</option>
                    </select>
                    <input placeholder="Descripción" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="number" step="0.01" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: Number(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>

                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL }}>Valor de Mercadería</h4>
                  <div style={{ height: '200px' }}><ResponsiveContainer><BarChart data={valorInventario}><XAxis dataKey="nombre" /><Tooltip formatter={(v)=>`S/ ${Number(v).toFixed(2)}`} /><Bar dataKey="valor" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <div><small>Costo</small><br/><strong>S/ {valorInventario[0].valor.toFixed(2)}</strong></div>
                    <div><small>Venta</small><br/><strong style={{ color: FUCSIA_PRINCIPAL }}>S/ {valorInventario[1].valor.toFixed(2)}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0 }}>Libro Diario (Editar/Eliminar)</h4>
                  <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                        <tr><th style={{ textAlign: 'left', padding: '10px' }}>Detalle</th><th style={{ textAlign: 'right', padding: '10px' }}>Monto</th><th style={{ padding: '10px' }}></th></tr>
                      </thead>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '12px' }}>
                                  <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={{...bjInput, padding:'8px', marginBottom:'5px'}}><option value="Gasto Local">Gasto Local</option><option value="Compra Stock">Compra Stock</option><option value="Ingreso Adicional">Ingreso Adicional</option><option value="Inversión">Inversión Inicial</option><option value="Retiro Ganancias">Retiro Ganancias</option></select>
                                  <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...bjInput, padding:'8px'}} />
                                  <input type="number" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:Number(e.target.value)})} style={{...bjInput, marginTop:'8px', padding:'8px'}} />
                                  <div style={{marginTop: '10px', display:'flex', gap:'10px'}}>
                                    <button onClick={guardarCambiosFinanza} style={{backgroundColor:'#16A34A', color:'#fff', padding:'8px 15px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}>GUARDAR</button>
                                    <button onClick={()=>setIdFinanzaEditando(null)} style={{background:'none', border:'none', cursor:'pointer'}}>CANCELAR</button>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '10px' }}><small style={{fontWeight:'bold', color:FUCSIA_PRINCIPAL}}>{f.tipo}</small><br/>{f.descripcion}</td>
                                <td style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', color: f.tipo.includes('Ingreso') || f.tipo.includes('Inversión') ? '#16A34A' : FUCSIA_PRINCIPAL }}>S/ {f.monto.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '10px' }}>
                                  <button onClick={()=> prepararEdicionFinanza(f)} style={{background:'none', border:'none', cursor:'pointer'}}>✏️</button>
                                  <button onClick={()=> borrarFinanza(f.id)} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={glassCard}>
                  <h4 style={{ marginTop: 0 }}>Ajuste de Stock Rápido</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <tbody>
                        {productos.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '10px' }}>{p.nombre}</td>
                            <td><input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '50px', padding: '5px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }} /></td>
                            <td><button onClick={() => guardarNuevoStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '10px' }}>OK</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}