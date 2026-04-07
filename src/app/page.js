"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
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

  // NUEVO ESTADO: CARRITO DE COMPRAS
  const [carrito, setCarrito] = useState([]);

  // --- ESTADOS EDICIÓN DE VENTA ---
  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  
  // --- ESTADOS GESTIÓN/CONTABILIDAD ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  // COLORES BJ IMPORTACIONES
  const COLORS = ['#E11D48', '#FB7185', '#F43F5E', '#BE123C', '#9F1239', '#881337'];

  // --- 📡 EFECTO: TÍTULO Y TIEMPO REAL ---
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

  // --- 🏆 LÓGICA DE NEGOCIO (MEMOS) ---
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
      if (!resumen[nombre]) resumen[nombre] = { nombre, gananciaTotal: 0 };
      resumen[nombre].gananciaTotal += v.ganancia_total;
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

  // CÁLCULOS FINANCIEROS ACTUALIZADOS
  const resumenFinanciero = useMemo(() => {
    const gastosEInversiones = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Compra Stock' || f.tipo === 'Retiro Ganancias').reduce((acc, f) => acc + f.monto, 0);
    const ingresosAdicionales = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión').reduce((acc, f) => acc + f.monto, 0);
    const gananciaNetaVentas = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    const ingresosVentasBruto = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    const cajaActual = ingresosVentasBruto + ingresosAdicionales - gastosEInversiones;

    return { gastos: gastosEInversiones, ingresosAdicionales, gananciaNetaVentas, cajaActual };
  }, [finanzas, ventas]);

  const valorInventario = useMemo(() => {
    let costoTotal = 0;
    let ventaTotal = 0;
    productos.forEach(p => {
      if (p.stock > 0) {
        costoTotal += (p.precio_compra * p.stock);
        ventaTotal += (p.precio_venta * p.stock);
      }
    });
    return [
      { nombre: 'Costo Invertido', valor: costoTotal, fill: '#1E1B1C' },
      { nombre: 'Venta Público', valor: ventaTotal, fill: '#E11D48' }
    ];
  }, [productos]);

  // --- 🛒 NUEVA LÓGICA DE CARRITO Y VENTAS ---
  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const color = coloresElegidos[p.id] || (p.colores?.split(',')[0].trim() || 'N/A');
    
    // Validar stock sumando lo que ya está en el carrito
    const cantEnCarrito = carrito.filter(item => item.producto_id === p.id).reduce((acc, item) => acc + item.cantidad, 0);
    if (p.stock < cant + cantEnCarrito) return alert(`¡Stock insuficiente! Solo quedan ${p.stock - cantEnCarrito} disponibles.`);

    setCarrito([...carrito, {
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: cant,
      color: color,
      precio_venta: p.precio_venta,
      precio_compra: p.precio_compra
    }]);
  };

  const quitarDelCarrito = (index) => {
    const nuevo = [...carrito];
    nuevo.splice(index, 1);
    setCarrito(nuevo);
  };

  const finalizarVentaLote = async (conWhatsapp = false) => {
    if (!cliente || !localidad) return alert("Por favor, ingresa el Cliente y el Pueblo/Zona.");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    // Preparar todas las ventas para Supabase
    const inserts = carrito.map(item => ({
      cliente_nombre: cliente,
      localidad: localidad,
      telefono: telefono || '',
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      color: item.color,
      precio_venta_unitario: item.precio_venta,
      precio_costo_unitario: item.precio_compra,
      ganancia_total: (item.precio_venta - item.precio_compra) * item.cantidad
    }));

    const { error } = await supabase.from('ventas').insert(inserts);

    if (!error) {
      // Actualizar stock de cada producto vendido
      for (const item of carrito) {
        const prod = productos.find(p => p.id === item.producto_id);
        if (prod) {
          await supabase.from('productos').update({ stock: prod.stock - item.cantidad }).eq('id', item.producto_id);
        }
      }

      // Enviar ticket único por WhatsApp
      if (conWhatsapp && telefono) {
        let msg = `¡Hola *${cliente}*! 👋 Aquí tienes tu ticket de *B J Importaciones Chiclayo*.%0A%0A*Detalle de tu compra:*%0A`;
        let totalGeneral = 0;
        carrito.forEach(item => {
          msg += `- ${item.cantidad}x ${item.nombre} (${item.color}) : S/ ${(item.precio_venta * item.cantidad).toFixed(2)}%0A`;
          totalGeneral += (item.precio_venta * item.cantidad);
        });
        msg += `%0A*TOTAL A PAGAR: S/ ${totalGeneral.toFixed(2)}*%0A%0A¡Muchas gracias por tu preferencia! 😊`;
        window.open(`https://wa.me/51${telefono.replace(/\D/g,'')}?text=${msg}`, '_blank');
      }

      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]);
    } else {
      alert("Error al procesar la venta: " + error.message);
    }
  };

  const eliminarProductoCatalogo = async (p) => {
    if (!confirm(`¿Estás seguro de eliminar "${p.nombre}" permanentemente del catálogo?`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', p.id);
    if (error) alert("No se pudo eliminar: " + error.message);
  };

  const agregarProductoAlStock = async (e) => {
    e.preventDefault();
    await supabase.from('productos').insert([formProd]);
    setFormProd({ nombre: '', precio_compra: '', precio_venta: '', stock: '', colores: '' });
  };

  const guardarNuevoStock = async (p) => {
    const nuevoStock = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    const { error } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
    if (!error) {
      alert(`Stock actualizado a ${nuevoStock}`);
    } else {
      alert("Error: " + error.message);
    }
  };

  // --- 🛠️ ACCIONES DE VENTAS INDIVIDUALES (EDITAR/BORRAR HISTORIAL) ---
  const borrarVenta = async (v) => {
    if (!confirm("¿Deseas anular esta venta? El stock se devolverá al inventario.")) return;
    const prod = productos.find(p => p.id === v.producto_id);
    if (prod) await supabase.from('productos').update({ stock: prod.stock + v.cantidad }).eq('id', prod.id);
    await supabase.from('ventas').delete().eq('id', v.id);
  };

  const prepararEdicionVenta = (v) => { setIdVentaEditando(v.id); setFormEditVenta({ ...v }); };

  const guardarCambiosVenta = async () => {
    const vOriginal = ventas.find(v => v.id === idVentaEditando);
    const prod = productos.find(p => p.id === formEditVenta.producto_id);
    const diferenciaStock = formEditVenta.cantidad - vOriginal.cantidad;
    if (prod.stock < diferenciaStock) return alert("No hay stock suficiente.");

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
    }
  };

  // --- 🛠️ ACCIONES FINANCIERAS ---
  const registrarMovimientoFinanciero = async (e) => {
    e.preventDefault();
    await supabase.from('finanzas').insert([formFinanzas]);
    setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  };

  const enviarWhatsAppHistorial = (v) => {
    const prod = productos.find(p => p.id === v.producto_id)?.nombre || "Producto";
    const msg = `¡Hola ${v.cliente_nombre}! 👋 Ticket de *B J Importaciones Chiclayo*. %0A%0A*Detalle:* ${v.cantidad}x ${prod} (${v.color})%0A*Total:* S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A%0A¡Gracias! 😊`;
    window.open(`https://wa.me/51${v.telefono.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const exportarExcel = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Pueblo,Producto,Cantidad,Total S/\n";
    ventasDelDia.forEach(v => {
      const pn = productos.find(p => p.id === v.producto_id)?.nombre;
      csv += `${fechaConsulta},${v.cliente_nombre},${v.localidad},${pn},${v.cantidad},${(v.precio_venta_unitario * v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `Cierre_BJC_${fechaConsulta}.csv`); link.click();
  };

  // --- ESTILOS ---
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
        
        {/* ================= VISTA: VENTAS ================= */}
        {vista === 'ventas' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '35px' }}>
              <div style={glassCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#E11D48', fontWeight: '800', fontSize: '14px' }}>CAJA HOY</span>
                  <button onClick={exportarExcel} style={{ backgroundColor: '#FEE2E2', border: 'none', padding: '6px 12px', borderRadius: '8px', color: '#E11D48', cursor: 'pointer', fontWeight: 'bold' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: 0, fontSize: '2.5rem' }}>S/ {totalesDia.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: 'bold' }}>Ganancia: S/ {totalesDia.ganancia.toFixed(2)}</div>
              </div>

              <div style={glassCard}>
                <span style={{ color: '#E11D48', fontWeight: '800', fontSize: '14px', display: 'block', marginBottom: '15px' }}>MAPA CHICLAYO</span>
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
                    <h3 style={{ margin: 0 }}>{rankingEstrellas[0].nombre}</h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>S/ {rankingEstrellas[0].gananciaTotal.toFixed(2)} ganancia</p>
                  </div>
                ) : <p>Sin ventas...</p>}
              </div>
            </div>

            <div style={{ ...glassCard, marginBottom: '35px', border: '2px solid #FEE2E2' }}>
              <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#E11D48' }}>Datos del Cliente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <input placeholder="👤 Nombre" value={cliente} onChange={e => setCliente(e.target.value)} style={bjInput} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Pueblo / Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>

              {/* PANEL DEL CARRITO DE COMPRAS (Solo visible si hay items) */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#F0FDF4', border: '2px solid #16A34A', borderRadius: '16px', padding: '20px', marginBottom: '25px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#16A34A', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🛒 Carrito de {cliente || 'Cliente'}</span>
                    <span>{carrito.length} ítems</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    {carrito.map((item, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #BBF7D0' }}>
                        <div>
                          <strong style={{ color: '#1E1B1C' }}>{item.cantidad}x {item.nombre}</strong> <small>({item.color})</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <strong style={{ color: '#16A34A' }}>S/ {(item.precio_venta * item.cantidad).toFixed(2)}</strong>
                          <button onClick={() => quitarDelCarrito(index)} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1E1B1C', textAlign: 'right', fontSize: '1.5rem' }}>
                    Total: S/ {carrito.reduce((acc, i) => acc + (i.precio_venta * i.cantidad), 0).toFixed(2)}
                  </h3>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <button onClick={() => finalizarVentaLote(false)} style={{ flex: 1, backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                      PAGAR Y GUARDAR
                    </button>
                    <button onClick={() => finalizarVentaLote(true)} style={{ flex: 1, backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      📱 GUARDAR Y ENVIAR WHATSAPP
                    </button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar producto para agregar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, border: '2px solid #E11D48' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '25px', maxHeight: '500px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                  <div key={p.id} style={{ border: '2px solid #FFF1F2', padding: '20px', borderRadius: '18px', backgroundColor: '#fff', position: 'relative' }}>
                    
                    <button onClick={() => eliminarProductoCatalogo(p)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#FEE2E2' }}>🗑️</button>
                    
                    <strong style={{ fontSize: '17px', display: 'block', marginBottom: '10px', paddingRight: '20px' }}>{p.nombre}</strong>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <select onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '8px', flex: 1 }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', border: '2px solid #FEE2E2', borderRadius: '10px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ padding: '8px', border: 'none', background: 'none' }}>-</button>
                        <span style={{ alignSelf: 'center', fontWeight: 'bold', width: '25px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ padding: '8px', border: 'none', background: 'none' }}>+</button>
                      </div>
                    </div>
                    {/* BOTÓN ACTUALIZADO PARA CARRITO */}
                    <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: p.stock > 0 ? '#1E1B1C' : '#E5E7EB', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {p.stock > 0 ? `AGREGAR S/ ${(p.precio_venta * (cantidades[p.id] || 1)).toFixed(2)} 🛒` : 'AGOTADO'}
                    </button>
                    <small style={{ display: 'block', textAlign: 'center', marginTop: '10px', color: p.stock < 5 ? '#E11D48' : '#64748b' }}>Stock: {p.stock}</small>
                  </div>
                ))}
              </div>
            </div>

            <div style={glassCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h4>Historial de Ítems Vendidos</h4>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '2px solid #FEE2E2' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {ventasDelDia.slice().reverse().map(v => (
                  <div key={v.id} style={{ padding: '18px', backgroundColor: '#FFF5F7', borderRadius: '16px' }}>
                    {idVentaEditando === v.id ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', backgroundColor: '#FEE2E2', padding: '15px', borderRadius: '12px' }}>
                        <input style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px' }} value={formEditVenta.cliente_nombre} onChange={e => setFormEditVenta({...formEditVenta, cliente_nombre: e.target.value})} />
                        <input style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px' }} value={formEditVenta.localidad} onChange={e => setFormEditVenta({...formEditVenta, localidad: e.target.value})} />
                        <input type="number" style={{ width: '80px', padding: '10px', border: 'none', borderRadius: '8px' }} value={formEditVenta.cantidad} onChange={e => setFormEditVenta({...formEditVenta, cantidad: Number(e.target.value)})} />
                        <button onClick={guardarCambiosVenta} style={{ backgroundColor: '#16A34A', color: 'white', padding: '10px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>OK</button>
                        <button onClick={() => setIdVentaEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#E11D48' }}>X</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#E11D48' }}>{v.cliente_nombre}</strong> ({v.localidad})<br/>
                          <small>{v.cantidad}x {productos.find(p => p.id === v.producto_id)?.nombre} | {v.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '900' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                          <button onClick={() => enviarWhatsAppHistorial(v)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📱</button>
                          
                          <button onClick={() => prepararEdicionVenta(v)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => borrarVenta(v)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#E11D48', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA: CONTABILIDAD Y GESTIÓN ================= */}
        {vista === 'contabilidad' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              
              <div style={{ ...glassCard, borderLeft: '8px solid #E11D48' }}>
                <small style={{ color: '#E11D48', fontWeight: 'bold' }}>GASTOS E INVERSIONES</small>
                <h2 style={{ margin: 0 }}>S/ {resumenFinanciero.gastos.toFixed(2)}</h2>
              </div>
              
              <div style={{ ...glassCard, borderLeft: '8px solid #16A34A' }}>
                <small style={{ color: '#16A34A', fontWeight: 'bold' }}>INGRESOS ADICIONALES</small>
                <h2 style={{ margin: 0, color: '#16A34A' }}>S/ {resumenFinanciero.ingresosAdicionales.toFixed(2)}</h2>
              </div>
              
              <div style={{ ...glassCard, borderLeft: '8px solid #3B82F6' }}>
                <small style={{ color: '#3B82F6', fontWeight: 'bold' }}>GANANCIA REAL NETA</small>
                <h2 style={{ margin: 0, color: '#3B82F6' }}>S/ {resumenFinanciero.gananciaNetaVentas.toFixed(2)}</h2>
              </div>

              <div style={{ ...glassCard, backgroundColor: '#E11D48', color: '#fff' }}>
                <small style={{ fontWeight: 'bold' }}>DINERO EN CAJA ACTUAL</small>
                <h2 style={{ margin: 0 }}>S/ {resumenFinanciero.cajaActual.toFixed(2)}</h2>
              </div>

            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Valor de Mercadería en Tienda</h4>
                  <div style={{ width: '100%', height: '200px', marginTop: '15px' }}>
                    <ResponsiveContainer>
                      <BarChart data={valorInventario}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="nombre" fontSize={12} />
                        <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
                        <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                          {valorInventario.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px', borderTop: '2px solid #FFF1F2', paddingTop: '15px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <small style={{ color: '#64748b', fontWeight: 'bold' }}>Costo Invertido</small>
                      <h3 style={{ margin: 0, color: '#1E1B1C', fontSize: '1.2rem' }}>S/ {valorInventario[0].valor.toFixed(2)}</h3>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <small style={{ color: '#64748b', fontWeight: 'bold' }}>Venta al Público</small>
                      <h3 style={{ margin: 0, color: '#E11D48', fontSize: '1.2rem' }}>S/ {valorInventario[1].valor.toFixed(2)}</h3>
                    </div>
                  </div>
                </div>

                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Registrar Movimiento Financiero</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={registrarMovimientoFinanciero}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}>
                      <option value="Gasto Local">🏪 Gasto Operativo (Luz, alquiler)</option>
                      <option value="Compra Stock">📦 Compra de Mercadería</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                      <option value="Inversión">💵 Inversión Inicial</option>
                      <option value="Retiro Ganancias">🏧 Retiro Personal</option>
                    </select>
                    <input placeholder="Descripción del movimiento" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="number" step="0.01" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: Number(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: '#E11D48', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>

                <div style={{ ...glassCard, border: '2px solid #E11D48' }}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Cargar Nuevo Producto</h4>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={agregarProductoAlStock}>
                    <input placeholder="Nombre" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInput} />
                    <input placeholder="Colores (comas)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={bjInput} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" step="0.01" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: e.target.value})} style={bjInput} />
                      <input type="number" step="0.01" placeholder="Venta S/" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: e.target.value})} style={bjInput} />
                    </div>
                    <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Ajuste de Stock Rápido</h4>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', color: '#E11D48', borderBottom: '2px solid #FFF1F2' }}>
                          <th style={{ padding: '12px' }}>Producto</th>
                          <th style={{ padding: '12px' }}>Stock</th>
                          <th style={{ padding: '12px' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map(p => (
                          <tr key={`stock-${p.id}`} style={{ borderBottom: '1px solid #FFF1F2' }}>
                            <td style={{ padding: '12px' }}>{p.nombre}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>
                              <input 
                                type="number" 
                                value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} 
                                onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})}
                                style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '12px' }}>
                              <button onClick={() => guardarNuevoStock(p)} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                                ACTUALIZAR
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: '#E11D48' }}>Libro Diario</h4>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', color: '#E11D48', borderBottom: '2px solid #FFF1F2' }}>
                          <th style={{ padding: '15px' }}>Concepto</th>
                          <th style={{ padding: '15px' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={`fin-${f.id}`} style={{ borderBottom: '1px solid #FFF1F2' }}>
                            <td style={{ padding: '15px' }}>
                              <span style={{ fontSize: '11px', backgroundColor: '#FFF1F2', color: '#E11D48', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{f.tipo}</span><br/>
                              <div style={{ marginTop: '5px' }}>{f.descripcion}</div>
                            </td>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: f.tipo.includes('Ingreso') || f.tipo.includes('Inversión') ? '#16A34A' : '#E11D48' }}>
                              {f.tipo.includes('Ingreso') || f.tipo.includes('Inversión') ? '+' : '-'} S/ {f.monto.toFixed(2)}
                            </td>
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