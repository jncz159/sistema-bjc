"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCFinalChiclayo() {
  // --- NAVEGACIÓN ---
  const [vista, setVista] = useState('ventas'); 

  // --- ESTADOS DE DATOS ---
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- ESTADOS FORMULARIOS VENTAS ---
  const [busqueda, setBusqueda] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});

  // --- ESTADOS EDICIÓN DE VENTA ---
  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  
  // --- ESTADOS GESTIÓN/CONTABILIDAD ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });

  // COLORES BJ IMPORTACIONES
  const COLORS = ['#E11D48', '#FB7185', '#F43F5E', '#BE123C', '#9F1239', '#881337'];

  // --- 📡 EFECTO: TÍTULO, CARGA Y TIEMPO REAL ---
  useEffect(() => {
    document.title = "Tienda BJ";
    cargarTodo();

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
        setCantidades(prev => ({ ...cants, ...prev }));
        setColoresElegidos(prev => ({ ...cols, ...prev }));
    }
    if (v) setVentas(v);
    if (f) setFinanzas(f);
  };

  // --- 🏆 LÓGICA DE NEGOCIO ---
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

  // --- 🛠️ ACCIONES ---
  const registrarVenta = async (p) => {
    const cant = cantidades[p.id] || 1;
    if (!cliente || !localidad) return alert("Completa Cliente y Pueblo");
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
    }
  };

  const borrarVenta = async (v) => {
    if (!confirm("¿Deseas anular esta venta?")) return;
    const prod = productos.find(p => p.id === v.producto_id);
    if (prod) await supabase.from('productos').update({ stock: prod.stock + v.cantidad }).eq('id', prod.id);
    await supabase.from('ventas').delete().eq('id', v.id);
  };

  // --- 🗑️ NUEVA FUNCIÓN: ELIMINAR PRODUCTO INDIVIDUAL ---
  const eliminarProductoCatalogo = async (p) => {
    if (!confirm(`¿Estás seguro de eliminar "${p.nombre}" permanentemente del catálogo?`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', p.id);
    if (error) {
      alert("No se pudo eliminar: " + error.message);
    } else {
      alert("Producto eliminado del catálogo.");
    }
  };

  const prepararEdicionVenta = (v) => { setIdVentaEditando(v.id); setFormEditVenta({ ...v }); };

  const guardarCambiosVenta = async () => {
    const vOriginal = ventas.find(v => v.id === idVentaEditando);
    const prod = productos.find(p => p.id === formEditVenta.producto_id);
    const diferenciaStock = formEditVenta.cantidad - vOriginal.cantidad;
    const nuevaGanancia = (formEditVenta.precio_venta_unitario - formEditVenta.precio_costo_unitario) * formEditVenta.cantidad;
    const { error } = await supabase.from('ventas').update({
      cliente_nombre: formEditVenta.cliente_nombre, localidad: formEditVenta.localidad,
      telefono: formEditVenta.telefono, cantidad: formEditVenta.cantidad,
      color: formEditVenta.color, ganancia_total: nuevaGanancia
    }).eq('id', idVentaEditando);
    if (!error) {
      await supabase.from('productos').update({ stock: prod.stock - diferenciaStock }).eq('id', prod.id);
      setIdVentaEditando(null);
    }
  };

  const registrarMovimientoFinanciero = async (e) => {
    e.preventDefault();
    await supabase.from('finanzas').insert([formFinanzas]);
    setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  };

  const agregarProductoAlStock = async (e) => {
    e.preventDefault();
    await supabase.from('productos').insert([formProd]);
    setFormProd({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  };

  const enviarWhatsApp = (v) => {
    const prod = productos.find(p => p.id === v.producto_id)?.nombre || "Producto";
    const msg = `¡Hola ${v.cliente_nombre}! 👋 Ticket de *B J Importaciones Chiclayo*. %0A%0A*Detalle:* ${v.cantidad}x ${prod} (${v.color})%0A*Total:* S/ ${v.precio_venta_unitario * v.cantidad}%0A%0A¡Gracias! 😊`;
    window.open(`https://wa.me/51${v.telefono.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const exportarRespaldoExcel = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Pueblo,Producto,Cantidad,Total S/\n";
    ventasDelDia.forEach(v => {
      const pn = productos.find(p => p.id === v.producto_id)?.nombre;
      csv += `${fechaConsulta},${v.cliente_nombre},${v.localidad},${pn},${v.cantidad},${v.precio_venta_unitario * v.cantidad}\n`;
    });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `Cierre_BJC_${fechaConsulta}.csv`); link.click();
  };

  // --- ESTILOS VISUALES ---
  const glassCard = { backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 15px -3px rgba(225, 29, 72, 0.05)', border: '1px solid #FFF1F2' };
  const bjInput = { padding: '14px', borderRadius: '12px', border: '2px solid #FEE2E2', width: '100%', outline: 'none', fontSize: '15px' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ backgroundColor: '#ffffff', padding: '15px 25px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#E11D48', color: '#fff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>BJ</div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#E11D48' }}>IMPORTACIONES</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#FEE2E2', padding: '5px', borderRadius: '14px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? '#E11D48' : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : '#E11D48', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>VENTAS</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? '#E11D48' : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : '#E11D48', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>GESTIÓN</button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        
        {vista === 'ventas' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '35px' }}>
              <div style={glassCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#E11D48', fontWeight: '800', fontSize: '14px' }}>CAJA DEL DÍA</span>
                  <button onClick={exportarRespaldoExcel} style={{ backgroundColor: '#FEE2E2', border: 'none', padding: '6px 12px', borderRadius: '8px', color: '#E11D48', cursor: 'pointer', fontWeight: 'bold' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: 0, fontSize: '2.5rem' }}>S/ {totalesDia.caja}</h2>
                <div style={{ marginTop: '10px', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>Ganancia: S/ {totalesDia.ganancia}</div>
              </div>

              <div style={glassCard}>
                <span style={{ color: '#E11D48', fontWeight: '800', fontSize: '14px', display: 'block', marginBottom: '15px' }}>ZONAS ACTIVAS</span>
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

              <div style={{ ...glassCard, backgroundColor: '#E11D48', color: '#fff' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>🏆 PRODUCTO ESTRELLA</span>
                {rankingEstrellas[0] ? (
                  <div style={{ marginTop: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{rankingEstrellas[0].nombre}</h3>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '13px' }}>S/ {rankingEstrellas[0].gananciaTotal} de ganancia</p>
                  </div>
                ) : <p style={{ marginTop: '20px' }}>Sin ventas todavía</p>}
              </div>
            </div>

            <div style={{ ...glassCard, marginBottom: '35px', border: '2px solid #FEE2E2' }}>
              <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#E11D48' }}>Cátalogo de Productos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <input placeholder="👤 Cliente" value={cliente} onChange={e => setCliente(e.target.value)} style={bjInput} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Pueblo / Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>
              <div style={{ position: 'relative' }}>
                <input placeholder="🔍 Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, border: '2px solid #E11D48', paddingLeft: '50px' }} />
                <span style={{ position: 'absolute', left: '18px', top: '15px', fontSize: '20px' }}>🔎</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '25px', maxHeight: '500px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                  <div key={p.id} style={{ border: '2px solid #FFF1F2', padding: '20px', borderRadius: '18px', backgroundColor: '#fff', position: 'relative' }}>
                    {/* BOTÓN ELIMINAR ITEM */}
                    <button 
                        onClick={() => eliminarProductoCatalogo(p)} 
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#FEE2E2' }}
                        title="Eliminar producto"
                    >🗑️</button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px', paddingRight: '20px' }}>
                      <strong style={{ fontSize: '17px' }}>{p.nombre}</strong>
                      <span style={{ backgroundColor: '#E11D48', color: '#fff', padding: '5px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>S/ {p.precio_venta}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '8px', flex: 1, fontSize: '13px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', border: '2px solid #FEE2E2', borderRadius: '10px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>-</button>
                        <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                    <button onClick={() => registrarVenta(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: p.stock > 0 ? '#1E1B1C' : '#E5E7EB', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {p.stock > 0 ? `VENDER S/ ${p.precio_venta * (cantidades[p.id] || 1)}` : 'AGOTADO'}
                    </button>
                    <small style={{ display: 'block', textAlign: 'center', marginTop: '10px', color: p.stock < 5 ? '#E11D48' : '#64748b' }}>Stock: {p.stock}</small>
                  </div>
                ))}
              </div>
            </div>

            <div style={glassCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h4 style={{ margin: 0 }}>Ventas de Hoy</h4>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '2px solid #FEE2E2' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {ventasDelDia.reverse().map(v => (
                  <div key={v.id} style={{ padding: '18px', backgroundColor: '#FFF5F7', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#E11D48' }}>{v.cliente_nombre}</strong> ({v.localidad})<br/>
                        <small>{v.cantidad}x {productos.find(p => p.id === v.producto_id)?.nombre} | {v.color}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900' }}>S/ {v.precio_venta_unitario * v.cantidad}</span>
                        <button onClick={() => enviarWhatsApp(v)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📱</button>
                        <button onClick={() => borrarVenta(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#E11D48' }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA GESTIÓN ================= */}
        {vista === 'contabilidad' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '35px' }}>
              <div style={{ ...glassCard, borderLeft: '8px solid #E11D48' }}>
                <small style={{ color: '#E11D48', fontWeight: 'bold' }}>MERCADERÍA (COSTO)</small>
                <h2 style={{ margin: 0 }}>S/ {resumenFinanciero.inversion}</h2>
              </div>
              <div style={{ ...glassCard, borderLeft: '8px solid #1E1B1C' }}>
                <small style={{ color: '#64748b', fontWeight: 'bold' }}>GASTOS TOTALES</small>
                <h2 style={{ margin: 0, color: '#1E1B1C' }}>S/ {resumenFinanciero.gastos}</h2>
              </div>
              <div style={{ ...glassCard, backgroundColor: '#E11D48', color: '#fff' }}>
                <small style={{ fontWeight: 'bold' }}>GANANCIA REAL NETO</small>
                <h2 style={{ margin: 0 }}>S/ {resumenFinanciero.neto}</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Registrar Gasto</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={registrarMovimientoFinanciero}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}>
                      <option value="Gasto Local">🏪 Gasto Operativo</option>
                      <option value="Compra Stock">📦 Compra de Mercadería</option>
                      <option value="Retiro Ganancias">🏧 Retiro Personal</option>
                    </select>
                    <input placeholder="Descripción" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="number" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: Number(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: '#E11D48', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold' }}>GUARDAR GASTO</button>
                  </form>
                </div>

                <div style={{ ...glassCard, border: '2px solid #E11D48' }}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Cargar Nuevo Producto</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={agregarProductoAlStock}>
                    <input placeholder="Nombre" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInput} />
                    <input placeholder="Colores (comas)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={bjInput} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: e.target.value})} style={bjInput} />
                      <input type="number" placeholder="Venta S/" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: e.target.value})} style={bjInput} />
                    </div>
                    <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold' }}>CARGAR AL CATÁLOGO</button>
                  </form>
                </div>
              </div>

              <div style={glassCard}>
                <h4 style={{ marginTop: 0, color: '#E11D48' }}>Historial Financiero</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#E11D48', borderBottom: '2px solid #FFF1F2' }}>
                        <th style={{ padding: '15px' }}>Concepto</th>
                        <th style={{ padding: '15px' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finanzas.map(f => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #FFF1F2' }}>
                          <td style={{ padding: '15px' }}>
                            <small style={{ fontWeight: 'bold', color: '#E11D48' }}>{f.tipo}</small><br/>
                            {f.descripcion}
                          </td>
                          <td style={{ padding: '15px', fontWeight: 'bold', color: f.tipo.includes('Venta') ? '#16A34A' : '#E11D48' }}>
                            S/ {f.monto}
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