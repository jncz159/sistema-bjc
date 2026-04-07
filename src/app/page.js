"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterChiclayo() {
  // --- NAVEGACIÓN Y VISTAS ---
  const [vista, setVista] = useState('ventas'); 

  // --- ESTADOS DE DATOS (RECIPIENTES) ---
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- ESTADOS DE FORMULARIOS (VENTAS) ---
  const [busqueda, setBusqueda] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});

  // --- ESTADOS DE EDICIÓN DE VENTA ---
  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  
  // --- ESTADOS DE GESTIÓN / INVENTARIO ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });

  const COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

  // --- 📡 CONEXIÓN EN TIEMPO REAL (REALTIME) ---
  useEffect(() => {
    cargarTodo();

    // Creamos un canal que escucha CUALQUIER cambio en las 3 tablas principales
    const canalRealtime = supabase
      .channel('tienda-chiclayo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();

    return () => { supabase.removeChannel(canalRealtime); };
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
        // Mantenemos los valores que el usuario ya esté escribiendo para no borrarlos al sincronizar
        setCantidades(prev => ({ ...cants, ...prev }));
        setColoresElegidos(prev => ({ ...cols, ...prev }));
    }
    if (v) setVentas(v);
    if (f) setFinanzas(f);
  };

  // --- 🏆 LÓGICA DE INTELIGENCIA DE NEGOCIO (MEMOS) ---
  const ventasDelDia = useMemo(() => ventas.filter(v => new Date(v.created_at).toISOString().split('T')[0] === fechaConsulta), [ventas, fechaConsulta]);

  const totalesDia = useMemo(() => ({
    caja: ventasDelDia.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
    ganancia: ventasDelDia.reduce((acc, v) => acc + v.ganancia_total, 0)
  }), [ventasDelDia]);

  const rankingEstrellas = useMemo(() => {
    const resumen = {};
    ventas.forEach(v => {
      const p = productos.find(prod => prod.id === v.producto_id);
      const nombre = p ? p.nombre : "???";
      if (!resumen[nombre]) resumen[nombre] = { nombre, gananciaTotal: 0, unidades: 0 };
      resumen[nombre].gananciaTotal += v.ganancia_total;
      resumen[nombre].unidades += v.cantidad;
    });
    return Object.values(resumen).sort((a, b) => b.gananciaTotal - a.gananciaTotal).slice(0, 5);
  }, [ventas, productos]);

  const datosPorZona = useMemo(() => {
    const zonas = {};
    ventas.forEach(v => {
      const loc = v.localidad ? v.localidad.trim().toUpperCase() : 'OTROS';
      if (!zonas[loc]) zonas[loc] = { name: loc, value: 0 };
      zonas[loc].value += 1;
    });
    return Object.values(zonas).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [ventas]);

  const resumenFinanciero = useMemo(() => {
    const inversion = finanzas.filter(f => f.tipo === 'Inversión' || f.tipo === 'Compra Stock').reduce((acc, f) => acc + f.monto, 0);
    const gastos = finanzas.filter(f => f.tipo === 'Gasto Local').reduce((acc, f) => acc + f.monto, 0);
    const retiros = finanzas.filter(f => f.tipo === 'Retiro Ganancias').reduce((acc, f) => acc + f.monto, 0);
    const gananciaBrutaTotal = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    return { inversion, gastos, retiros, neto: gananciaBrutaTotal - gastos - retiros };
  }, [finanzas, ventas]);

  // --- 🛠️ ACCIONES DE VENTA Y STOCK ---
  const registrarVenta = async (p) => {
    const cant = cantidades[p.id] || 1;
    if (!cliente || !localidad) return alert("Por favor, ingresa el nombre del cliente y el pueblo/distrito.");
    if (p.stock < cant) return alert("¡Stock insuficiente!");

    const ganancia = (p.precio_venta - p.precio_compra) * cant;
    const { error } = await supabase.from('ventas').insert([{
      cliente_nombre: cliente, localidad, telefono, producto_id: p.id, cantidad: cant, 
      color: coloresElegidos[p.id], precio_venta_unitario: p.precio_venta, 
      precio_costo_unitario: p.precio_compra, ganancia_total: ganancia
    }]);

    if (!error) {
      await supabase.from('productos').update({ stock: p.stock - cant }).eq('id', p.id);
      setCliente(''); setTelefono(''); setLocalidad('');
      alert("Venta registrada con éxito.");
    }
  };

  const borrarVenta = async (v) => {
    if (!confirm("¿Deseas anular esta venta? El stock será devuelto al inventario.")) return;
    const prod = productos.find(p => p.id === v.producto_id);
    if (prod) {
      await supabase.from('productos').update({ stock: prod.stock + v.cantidad }).eq('id', prod.id);
    }
    await supabase.from('ventas').delete().eq('id', v.id);
  };

  const prepararEdicionVenta = (v) => {
    setIdVentaEditando(v.id);
    setFormEditVenta({ ...v });
  };

  const guardarCambiosVenta = async () => {
    const vOriginal = ventas.find(v => v.id === idVentaEditando);
    const prod = productos.find(p => p.id === formEditVenta.producto_id);
    
    const diferenciaStock = formEditVenta.cantidad - vOriginal.cantidad;
    if (prod.stock < diferenciaStock) return alert("No hay stock suficiente para este cambio.");

    const nuevaGanancia = (formEditVenta.precio_venta_unitario - formEditVenta.precio_costo_unitario) * formEditVenta.cantidad;

    const { error } = await supabase.from('ventas').update({
      cliente_nombre: formEditVenta.cliente_nombre,
      localidad: formEditVenta.localidad,
      telefono: formEditVenta.telefono,
      cantidad: formEditVenta.cantidad,
      color: formEditVenta.color,
      ganancia_total: nuevaGanancia
    }).eq('id', idVentaEditando);

    if (!error) {
      await supabase.from('productos').update({ stock: prod.stock - diferenciaStock }).eq('id', prod.id);
      setIdVentaEditando(null);
      alert("Cambios guardados.");
    }
  };

  // --- 🛠️ ACCIONES DE GESTIÓN FINANCIERA ---
  const registrarMovimientoFinanciero = async (e) => {
    e.preventDefault();
    if (!formFinanzas.monto || !formFinanzas.descripcion) return alert("Completa todos los campos.");
    const { error } = await supabase.from('finanzas').insert([formFinanzas]);
    if (!error) {
      setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
      alert("Movimiento registrado.");
    }
  };

  const agregarProductoAlStock = async (e) => {
    e.preventDefault();
    if (!formProd.nombre || !formProd.precio_venta) return alert("Mínimo nombre y precio de venta.");
    const { error } = await supabase.from('productos').insert([formProd]);
    if (!error) {
      setFormProd({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
      alert("Producto creado en el catálogo.");
    }
  };

  // --- 📱 COMUNICACIÓN Y RESPALDO ---
  const enviarWhatsApp = (v) => {
    const prod = productos.find(p => p.id === v.producto_id)?.nombre || "Producto";
    const msg = `¡Hola ${v.cliente_nombre}! 👋 Ticket de *B J Importaciones Chiclayo*. %0A%0A*Detalle:* ${v.cantidad}x ${prod} (${v.color})%0A*Total:* S/ ${v.precio_venta_unitario * v.cantidad}%0A%0A¡Muchas gracias por tu compra! 😊`;
    // Reemplazamos cualquier carácter que no sea número del teléfono
    const numLimpio = v.telefono.replace(/\D/g,'');
    window.open(`https://wa.me/51${numLimpio}?text=${msg}`, '_blank');
  };

  const exportarRespaldoExcel = () => {
    if (ventasDelDia.length === 0) return alert("No hay ventas hoy para exportar.");
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Pueblo,Producto,Color,Cantidad,Total S/,Ganancia S/\n";
    ventasDelDia.forEach(v => {
      const pn = productos.find(p => p.id === v.producto_id)?.nombre;
      csv += `${fechaConsulta},${v.cliente_nombre},${v.localidad},${pn},${v.color},${v.cantidad},${v.precio_venta_unitario * v.cantidad},${v.ganancia_total}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_Caja_BJC_${fechaConsulta}.csv`);
    link.click();
  };

  // --- ESTILOS DE DISEÑO ---
  const cardStyle = { backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9' };
  const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%', outline: 'none', fontSize: '15px' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER DE LA APP */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '1px', fontWeight: '800' }}>B J IMPORTACIONES</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? '#38bdf8' : 'transparent', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>🛒 VENTAS</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? '#38bdf8' : 'transparent', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>💰 GESTIÓN</button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        
        {/* ================= VISTA: SALÓN DE VENTAS ================= */}
        {vista === 'ventas' && (
          <div>
            {/* DASHBOARD PRINCIPAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>CAJA DEL DÍA</span>
                  <button onClick={exportarRespaldoExcel} style={{ backgroundColor: '#f1f5f9', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>💾 EXPORTAR</button>
                </div>
                <h2 style={{ margin: 0, fontSize: '2.2rem' }}>S/ {totalesDia.caja}</h2>
                <small style={{ color: '#22c55e', fontWeight: 'bold' }}>Ganancia: S/ {totalesDia.ganancia}</small>
              </div>

              <div style={cardStyle}>
                <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '10px' }}>ZONAS DE CHICLAYO (MAPA)</span>
                <div style={{ width: '100%', height: '120px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={datosPorZona} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value">
                        {datosPorZona.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ ...cardStyle, backgroundColor: '#1e293b', color: '#fff' }}>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🏆 PRODUCTO ESTRELLA</span>
                {rankingEstrellas[0] ? (
                  <div style={{ marginTop: '10px' }}>
                    <h3 style={{ margin: 0 }}>{rankingEstrellas[0].nombre}</h3>
                    <small>S/ {rankingEstrellas[0].gananciaTotal} ganancia total</small>
                  </div>
                ) : <p style={{ margin: 0, fontSize: '13px', opacity: 0.5 }}>Sin datos todavía</p>}
              </div>
            </div>

            {/* BUSCADOR Y REGISTRO DE VENTA */}
            <div style={{ ...cardStyle, marginBottom: '30px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Nueva Operación</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <input placeholder="👤 Nombre del Cliente" value={cliente} onChange={e => setCliente(e.target.value)} style={inputStyle} />
                <input placeholder="📱 WhatsApp (9 dígitos)" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} />
                <input placeholder="📍 Pueblo o Distrito de envío" value={localidad} onChange={e => setLocalidad(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ position: 'relative', marginBottom: '25px' }}>
                <input placeholder="🔍 Escribe para buscar un producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, border: '2px solid #38bdf8', paddingLeft: '45px', backgroundColor: '#f0f9ff' }} />
                <span style={{ position: 'absolute', left: '15px', top: '13px', fontSize: '18px' }}>🔎</span>
              </div>

              {/* CUADRICULA DE PRODUCTOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxHeight: '500px', overflowY: 'auto', padding: '10px' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                  <div key={p.id} style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '14px', backgroundColor: '#fff', transition: '0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '16px' }}>{p.nombre}</strong>
                      <span style={{ backgroundColor: '#38bdf8', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>S/ {p.precio_venta}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '15px' }}>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...inputStyle, padding: '7px', flex: 1, fontSize: '13px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      
                      <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                        <span style={{ alignSelf: 'center', fontWeight: 'bold', width: '25px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                      </div>
                    </div>

                    <button 
                      onClick={() => registrarVenta(p)} 
                      disabled={p.stock <= 0}
                      style={{ width: '100%', backgroundColor: p.stock > 0 ? '#0f172a' : '#cbd5e1', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', transition: '0.3s' }}
                    >
                      {p.stock > 0 ? `VENDER POR S/ ${p.precio_venta * (cantidades[p.id] || 1)}` : 'SIN STOCK'}
                    </button>
                    <small style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: p.stock < 5 ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>Stock actual: {p.stock}</small>
                  </div>
                ))}
              </div>
            </div>

            {/* LISTA DE ÚLTIMOS MOVIMIENTOS */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0 }}>Ventas Registradas</h4>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ventasDelDia.length > 0 ? ventasDelDia.slice().reverse().map(v => (
                  <div key={v.id} style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    {idVentaEditando === v.id ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '10px' }}>
                        <input style={{ flex: 1, padding: '8px' }} value={formEditVenta.cliente_nombre} onChange={e => setFormEditVenta({...formEditVenta, cliente_nombre: e.target.value})} />
                        <input style={{ flex: 1, padding: '8px' }} value={formEditVenta.localidad} onChange={e => setFormEditVenta({...formEditVenta, localidad: e.target.value})} />
                        <input type="number" style={{ width: '70px', padding: '8px' }} value={formEditVenta.cantidad} onChange={e => setFormEditVenta({...formEditVenta, cantidad: Number(e.target.value)})} />
                        <button onClick={guardarCambiosVenta} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Guardar</button>
                        <button onClick={() => setIdVentaEditando(null)} style={{ backgroundColor: '#94a3b8', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>X</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>{v.cliente_nombre}</strong> <small style={{ color: '#64748b' }}>({v.localidad})</small><br/>
                          <small style={{ color: '#64748b' }}>{v.cantidad}x {productos.find(p => p.id === v.producto_id)?.nombre} | {v.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: '#10b981', fontSize: '16px' }}>S/ {v.precio_venta_unitario * v.cantidad}</span>
                          <button onClick={() => enviarWhatsApp(v)} style={{ backgroundColor: '#22c35e', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📱</button>
                          <button onClick={() => prepararEdicionVenta(v)} style={{ backgroundColor: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✏️</button>
                          <button onClick={() => borrarVenta(v)} style={{ backgroundColor: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444' }}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No hay ventas registradas para este día.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA: GESTIÓN DE NEGOCIO ================= */}
        {vista === 'contabilidad' && (
          <div>
            <h3 style={{ marginBottom: '25px', color: '#0f172a', fontWeight: '800' }}>Panel de Control Financiero</h3>
            
            {/* TARJETAS DE BALANCE GENERAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ ...cardStyle, borderLeft: '6px solid #3b82f6' }}>
                <small style={{ color: '#64748b', fontWeight: 'bold' }}>MERCADERÍA EN STOCK</small>
                <h2 style={{ margin: 0, fontSize: '1.8rem' }}>S/ {resumenFinanciero.inversion}</h2>
              </div>
              <div style={{ ...cardStyle, borderLeft: '6px solid #ef4444' }}>
                <small style={{ color: '#64748b', fontWeight: 'bold' }}>GASTOS Y COMPRAS</small>
                <h2 style={{ margin: 0, color: '#ef4444', fontSize: '1.8rem' }}>S/ {resumenFinanciero.gastos}</h2>
              </div>
              <div style={{ ...cardStyle, borderLeft: '6px solid #f59e0b' }}>
                <small style={{ color: '#64748b', fontWeight: 'bold' }}>RETIROS ACUMULADOS</small>
                <h2 style={{ margin: 0, color: '#f59e0b', fontSize: '1.8rem' }}>S/ {resumenFinanciero.retiros}</h2>
              </div>
              <div style={{ ...cardStyle, backgroundColor: '#22c55e', color: '#fff' }}>
                <small style={{ fontWeight: 'bold' }}>GANANCIA NETA REAL</small>
                <h2 style={{ margin: 0, fontSize: '1.8rem' }}>S/ {resumenFinanciero.neto}</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
              {/* COLUMNA: CARGAS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={cardStyle}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>➕ Registrar Gasto o Retiro</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={registrarMovimientoFinanciero}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={inputStyle}>
                      <option value="Gasto Local">🏪 Gasto Operativo (Luz, Alquiler)</option>
                      <option value="Compra Stock">📦 Compra de Inventario</option>
                      <option value="Retiro Ganancias">🏧 Retiro Personal</option>
                      <option value="Inversión">💵 Inversión Inicial</option>
                    </select>
                    <input placeholder="Descripción del movimiento" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={inputStyle} />
                    <input type="number" placeholder="Monto en Soles S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: Number(e.target.value)})} style={inputStyle} />
                    <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>GUARDAR MOVIMIENTO</button>
                  </form>
                </div>

                <div style={{ ...cardStyle, border: '2px solid #22c55e' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#16a34a' }}>📥 Alta de Producto Nuevo</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} onSubmit={agregarProductoAlStock}>
                    <input placeholder="Nombre del artículo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={inputStyle} />
                    <input placeholder="Colores (Ej: Negro, Azul, Oro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={inputStyle} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: e.target.value})} style={inputStyle} />
                      <input type="number" placeholder="Venta S/" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: e.target.value})} style={inputStyle} />
                    </div>
                    <input type="number" placeholder="Cantidad Inicial en Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={inputStyle} />
                    <button type="submit" style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>CARGAR AL CATÁLOGO</button>
                  </form>
                </div>
              </div>

              {/* COLUMNA: HISTORIAL FINANCIERO */}
              <div style={cardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Libro Diario de Caja</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ padding: '12px' }}>Fecha</th>
                        <th style={{ padding: '12px' }}>Concepto</th>
                        <th style={{ padding: '12px' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finanzas.map(f => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '12px', fontSize: '12px' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 'bold' }}>{f.tipo}</span><br/>
                            {f.descripcion}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: f.tipo.includes('Retiro') || f.tipo.includes('Gasto') || f.tipo.includes('Compra') ? '#ef4444' : '#22c55e' }}>
                            {f.tipo.includes('Retiro') || f.tipo.includes('Gasto') || f.tipo.includes('Compra') ? '-' : '+'} S/ {f.monto}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}