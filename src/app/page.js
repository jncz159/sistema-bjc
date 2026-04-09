"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  // --- UTILS: HORA PERÚ CHICLAYO (GMT-5) ---
  const getFechaPeru = (dateInput = new Date()) => {
    const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
    const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(new Date(dateInput));
    const anio = partes.find(p => p.type === 'year').value;
    const mes = partes.find(p => p.type === 'month').value;
    const dia = partes.find(p => p.type === 'day').value;
    return `${anio}-${mes}-${dia}`;
  };

  // --- FUNCIÓN LIMPIADORA DE DECIMALES (COMAS A PUNTOS) ---
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return valor;
    return valor.replace(',', '.').replace(/[^0-9.]/g, '');
  };

  // --- LÓGICA DE ETIQUETAS POR ANTIGÜEDAD ---
  const getEtiquetaProducto = (createdAt) => {
    const fechaCreacion = new Date(createdAt);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));
    if (diferenciaDias <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
    if (diferenciaDias > 3 && diferenciaDias <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
    return null;
  };

  // --- ESTADOS ---
  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';
  const COLORS = ['#F786C1', '#FCA5D4', '#FCC2E2', '#ED64A6', '#C64F8C', '#A13C6D'];

  // --- 📡 TIEMPO REAL ---
  useEffect(() => {
    document.title = "B J Importaciones | Gestión";
    cargarTodo();
    const canal = supabase.channel('bj-full-v19')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cargarTodo = async () => {
    const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
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

  // --- LÓGICA CRM Y CALCULOS ---
  const clientesUnicos = useMemo(() => [...new Set(ventas.map(v => v.cliente_nombre))].filter(Boolean), [ventas]);

  const handleClienteChange = (e) => {
    const nom = e.target.value; setCliente(nom);
    const c = ventas.find(v => v.cliente_nombre.toLowerCase() === nom.toLowerCase());
    if (c) { setLocalidad(c.localidad || ''); setTelefono(c.telefono || ''); }
  };

  const ventasFiltradas = useMemo(() => ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta || v.estado_pedido === 'En Almacén'), [ventas, fechaConsulta]);
  
  const ventasAgrupadas = useMemo(() => {
    const grupos = {};
    ventasFiltradas.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) grupos[key] = { id_principal: v.id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      grupos[key].items.push(v);
      grupos[key].total += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos).reverse();
  }, [ventasFiltradas]);

  const totalesDia = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      caja: vHoy.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
      ganancia: vHoy.reduce((acc, v) => acc + v.ganancia_total, 0)
    };
  }, [ventas]);

  const resumenFinanciero = useMemo(() => {
    const egresos = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto), 0);
    const extras = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto), 0);
    const brutoVentas = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    const gananciaNet = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    return { gastos: egresos, extras, gananciaVentas: gananciaNet, cajaActual: brutoVentas + extras - egresos };
  }, [finanzas, ventas]);

  // --- CUADRO DE VALORIZACIÓN DE STOCK (INVERSIÓN) ---
  const statsInventario = useMemo(() => {
    let costoTotal = 0; 
    let ventaTotal = 0; 
    let unidadesTotal = 0;
    productos.forEach(p => { 
      if (p.stock > 0) { 
        costoTotal += (Number(p.precio_compra) * p.stock); 
        ventaTotal += (Number(p.precio_venta) * p.stock); 
        unidadesTotal += p.stock;
      } 
    });
    return { costoTotal, ventaTotal, unidadesTotal, gananciaPotencial: ventaTotal - costoTotal };
  }, [productos]);

  const dataGrafico = [
    { nombre: 'Costo', valor: statsInventario.costoTotal, fill: '#1E1B1C' },
    { nombre: 'Venta', valor: statsInventario.ventaTotal, fill: FUCSIA_PRINCIPAL }
  ];

  // --- ACCIONES ---
  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const color = coloresElegidos[p.id];
    const precioBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if (p.stock < cant + enC) return alert(`Stock insuficiente.`);
    setCarrito([...carrito, { 
        producto_id: p.id, 
        nombre: p.nombre, 
        cantidad: cant, 
        color: color, 
        precio_venta: precioBase, 
        precio_compra: p.precio_compra 
    }]);
  };

  const actualizarPrecioManual = (idx, val) => {
    const nuevo = [...carrito];
    nuevo[idx].precio_venta = handleInputMonto(val);
    setCarrito(nuevo);
  };

  const finalizarVentaLote = async (estado = 'Entregado', conWA = false) => {
    if (!cliente || !localidad) return alert("Faltan datos.");
    const totalBruto = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const ratioDesc = totalBruto > 0 ? (Number(descuento) / totalBruto) : 0;

    const inserts = carrito.map(i => {
      const pUnit = Number(i.precio_venta);
      const subItem = pUnit * i.cantidad;
      const descItem = subItem * ratioDesc;
      return { 
        cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: pUnit, 
        precio_costo_unitario: i.precio_compra, ganancia_total: ((pUnit - i.precio_compra) * i.cantidad) - descItem, 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const i of carrito) {
        const pr = productos.find(p => p.id === i.producto_id);
        await supabase.from('productos').update({ stock: pr.stock - i.cantidad }).eq('id', i.producto_id);
      }
      if (conWA && telefono) {
        let m = `¡Hola *${cliente}*! 👋 Ticket B J Importaciones.%0A%0A*MODO:* ${tipoVenta}%0A`;
        carrito.forEach(i => { m += `- ${i.cantidad}x ${i.nombre} (${i.color}): S/ ${(Number(i.precio_venta) * i.cantidad).toFixed(2)}%0A`; });
        if(Number(descuento)>0) m += `%0A📉 Dscto: - S/ ${Number(descuento).toFixed(2)}`;
        m += `%0A%0A*TOTAL FINAL: S/ ${(totalBruto - Number(descuento)).toFixed(2)}*%0A¡Gracias! 😊`;
        window.open(`https://wa.me/51${telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
    }
  };

  const guardarNuevoStock = async (p) => {
    const ns = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: ns }).eq('id', p.id);
    alert("Sincronizado");
  };

  const guardarCambiosFinanza = async () => {
    await supabase.from('finanzas').update({ tipo: formEditFinanza.tipo, descripcion: formEditFinanza.descripcion, monto: Number(formEditFinanza.monto) }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
  };

  const exportarExcel = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Localidad,Estado,Item,Cant,Total\n";
    ventasFiltradas.forEach(v => {
      const pn = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${v.estado_pedido},${pn},${v.cantidad},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `Respaldo_BJ_${fechaConsulta}.csv`; link.click();
  };

  const bjInput = { padding: '14px', borderRadius: '12px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box' };
  const glassCard = { backgroundColor: '#ffffff', borderRadius: '20px', padding: '20px', boxShadow: `0 10px 15px -3px ${FUCSIA_PRINCIPAL}10`, border: '1px solid #FFF1F2' };

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
        
        {/* ================= VISTA VENTAS ================= */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={glassCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '800', fontSize: '12px' }}>CAJA HOY</span>
                  <button onClick={exportarExcel} style={{ backgroundColor: `#FCA5D420`, border: 'none', padding: '4px 10px', borderRadius: '6px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}>CIERRE DE CAJA</button>
                </div>
                <h2 style={{ margin: '5px 0', fontSize: '2.5rem' }}>S/ {totalesDia.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: 'bold', fontSize: '14px' }}>Ganancia Hoy: S/ {totalesDia.ganancia.toFixed(2)}</div>
              </div>
              <div style={glassCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '800', fontSize: '12px' }}>FECHA HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...bjInput, padding: '8px', marginTop: '5px' }} />
              </div>
            </div>

            <div style={{ ...glassCard, border: `2px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: FUCSIA_PRINCIPAL }}>Nuevo Pedido</h4>
                <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#666' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#666' }}>MENOR</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <input list="clist" placeholder="👤 Cliente" value={cliente} onChange={handleClienteChange} style={bjInput} />
                <datalist id="clist">{clientesUnicos.map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Pueblo / Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF5F7', border: `2px solid ${FUCSIA_PRINCIPAL}`, borderRadius: '16px', padding: '15px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {carrito.map((i, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #FCC2E2', paddingBottom: '8px', marginBottom: '8px', alignItems:'center' }}>
                        <div style={{ flex: 1 }}>{i.cantidad}x {i.nombre} <br/><small>({i.color})</small></div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                             <span style={{ fontSize: '10px', fontWeight: 'bold' }}>S/</span>
                             <input type="text" value={i.precio_venta} onChange={(e) => actualizarPrecioManual(idx, e.target.value)} style={{ width: '60px', padding: '4px', borderRadius: '6px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }} />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: FUCSIA_PRINCIPAL, border: '2px solid #FCC2E2', background: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '15px', borderTop: '1px dashed #FCA5D4', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: FUCSIA_PRINCIPAL }}>DSCTO ADICIONAL S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '80px', padding: '5px', borderRadius: '8px', border: `1px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center' }} />
                    <h3 style={{ margin: '10px 0' }}>Total Final: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => finalizarVentaLote('Entregado', false)} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>✅ PAGAR</button>
                    <button onClick={() => finalizarVentaLote('En Almacén', false)} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📦 ALMACÉN</button>
                    <button onClick={() => finalizarVentaLote('Entregado', true)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', gridColumn: '1/3' }}>📱 ENVIAR TICKET</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, border: `2px solid #FCC2E2`, marginBottom: '20px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const etiqueta = getEtiquetaProducto(p.created_at);
                  const activePrice = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '16px', borderRadius: '22px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      {etiqueta && <span style={{ position:'absolute', top: '-8px', left: '10px', backgroundColor: etiqueta.color, color: '#fff', fontSize: '9px', padding: '3px 8px', borderRadius: '10px', fontWeight: '900', zIndex: 10 }}>{etiqueta.tipo} {etiqueta.icono}</span>}
                      <strong style={{ display: 'block', height: '35px', overflow: 'hidden', fontSize: '13px' }}>{p.nombre}</strong>
                      <div style={{ margin: '8px 0', padding: '4px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: p.stock < 5 ? '#E11D48' : '#16A34A' }}>STOCK: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '5px', fontSize: '11px', marginBottom: '10px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 'bold' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer' }}>+</button>
                      </div>
                      <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '10px', borderRadius: '14px', fontSize: '11px', fontWeight: 'bold', cursor:'pointer' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(activePrice).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={glassCard}>
                <h4 style={{ margin: 0, marginBottom: '20px' }}>Historial Agrupado</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {ventasAgrupadas.map(g => (
                    <div key={g.id_principal} style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '18px', border: `1px solid ${g.items.some(i=>i.estado_pedido==='En Almacén') ? FUCSIA_PRINCIPAL : '#FCC2E2'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <div><strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '16px' }}>{g.cliente_nombre}</strong> <small>({g.localidad})</small></div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}>Total: S/ {g.total.toFixed(2)}</div>
                            <button onClick={() => {
                                let m = `¡Hola *${g.cliente_nombre}*! 👋 Ticket B J Importaciones.%0A%0A`;
                                g.items.forEach(v => { m += `- ${v.cantidad}x ${productos.find(p=>p.id===v.producto_id)?.nombre} (${v.color}): S/ ${(v.precio_venta_unitario*v.cantidad).toFixed(2)}%0A`; });
                                m += `%0A*TOTAL PAGADO: S/ ${g.total.toFixed(2)}*%0A¡Gracias! 😊`;
                                window.open(`https://wa.me/51${g.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', cursor:'pointer' }}>📱</button>
                        </div>
                    </div>
                    {g.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div style={{ fontSize: '12px' }}>{v.cantidad}x {productos.find(p => p.id === v.producto_id)?.nombre} <br/> <small>{v.color} {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : ''}</small></div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                            {v.estado_pedido === 'En Almacén' && <button onClick={async () => { if(confirm("¿Entregado?")) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', v.id); }} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor:'pointer' }}>ENTREGAR</button>}
                            <button onClick={() => { setIdVentaEditando(v.id); setFormEditVenta({...v}); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                            <button onClick={async () => { if(confirm("Anular?")) { const pr = productos.find(p=>p.id===v.producto_id); if(pr) await supabase.from('productos').update({stock: pr.stock+v.cantidad}).eq('id', pr.id); await supabase.from('ventas').delete().eq('id', v.id); } }} style={{ border: 'none', background: 'none', color: FUCSIA_PRINCIPAL }}>🗑️</button>
                        </div>
                        </div>
                    ))}
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== VISTA GESTIÓN ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* PANEL DE CAPITAL INVERTIDO (NUEVO) */}
            <div style={{ ...glassCard, border: `2px solid ${FUCSIA_PRINCIPAL}`, backgroundColor: '#FFF' }}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📊 Valorización Actual de B J Importaciones
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                    <div>
                        <small style={{ fontWeight: 'bold', color: '#64748B' }}>CAPITAL INVERTIDO (COSTO)</small>
                        <h3 style={{ margin: '5px 0', color: '#1E1B1C' }}>S/ {statsInventario.costoTotal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h3>
                        <p style={{ fontSize: '11px', color: '#94A3B8' }}>Dinero real en mercadería física</p>
                    </div>
                    <div>
                        <small style={{ fontWeight: 'bold', color: '#64748B' }}>RETORNO ESTIMADO (VENTA)</small>
                        <h3 style={{ margin: '5px 0', color: FUCSIA_PRINCIPAL }}>S/ {statsInventario.ventaTotal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h3>
                        <p style={{ fontSize: '11px', color: '#94A3B8' }}>Basado en precios mayoristas</p>
                    </div>
                    <div>
                        <small style={{ fontWeight: 'bold', color: '#16A34A' }}>GANANZA POTENCIAL</small>
                        <h3 style={{ margin: '5px 0', color: '#16A34A' }}>S/ {statsInventario.gananciaPotencial.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h3>
                        <p style={{ fontSize: '11px', color: '#94A3B8' }}>Utilidad bruta al liquidar stock</p>
                    </div>
                    <div>
                        <small style={{ fontWeight: 'bold', color: '#64748B' }}>PIEZAS EN ALMACÉN</small>
                        <h3 style={{ margin: '5px 0', color: '#1E1B1C' }}>{statsInventario.unidadesTotal} und.</h3>
                        <p style={{ fontSize: '11px', color: '#94A3B8' }}>Total de stock sumado</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div style={{ ...glassCard, borderLeft: `6px solid ${FUCSIA_PRINCIPAL}` }}><small style={{fontSize:'10px', fontWeight:'bold'}}>GASTOS / COMPRAS</small><h4>S/ {resumenFinanciero.gastos.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, borderLeft: '6px solid #16A34A' }}><small style={{fontSize:'10px', fontWeight:'bold'}}>INGRESOS EXTRAS</small><h4>S/ {resumenFinanciero.extras.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, borderLeft: '6px solid #3B82F6' }}><small style={{fontSize:'10px', fontWeight:'bold'}}>GANANCIA NETA REAL</small><h4>S/ {resumenFinanciero.gananciaVentas.toFixed(2)}</h4></div>
              <div style={{ ...glassCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff' }}><small style={{fontSize:'10px', fontWeight:'bold'}}>DINERO EN CAJA ACTUAL</small><h4>S/ {resumenFinanciero.cajaActual.toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0 }}>Registrar Movimiento Financiero</h4>
                  <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(formFinanzas.monto)}]); setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}>
                      <option value="Gasto Local">🏪 Gasto Local</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial</option>
                    </select>
                    <input placeholder="Descripción" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor:'pointer' }}>GUARDAR</button>
                  </form>
                </div>
                <div style={{ ...glassCard, border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0 }}>Cargar Nuevo Producto</h4>
                  <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('productos').insert([{...formProd, precio_compra: Number(formProd.precio_compra), precio_venta: Number(formProd.precio_venta), precio_menor: Number(formProd.precio_menor), stock: Number(formProd.stock)}]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); alert("Añadido."); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInput} />
                    <input placeholder="Colores (comas)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={bjInput} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={bjInput} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInput} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" placeholder="Precio MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...bjInput, border:'2px solid #F786C1'}} />
                        <input type="text" placeholder="Precio MENOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...bjInput, border:'2px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={glassCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '15px' }}>Ajuste de Stock y Catálogo</h4>
                  <input placeholder="🔍 Buscar para editar stock..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...bjInput, padding: '10px', marginBottom: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const etiqueta = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '15px', border: '1px solid #f1f1f1', borderRadius: '18px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 {etiqueta && <span style={{ backgroundColor: etiqueta.color, color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>{etiqueta.icono} {etiqueta.tipo}</span>}
                                 <strong style={{ fontSize: '13px' }}>{p.nombre}</strong>
                              </div>
                              <button onClick={async ()=> { if(confirm(`¿Eliminar?`)) await supabase.from('productos').delete().eq('id', p.id); }} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '12px' }}>
                              <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }} />
                              <button onClick={() => guardarNuevoStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor:'pointer' }}>GUARDAR</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={glassCard}>
                  <h4 style={{ marginTop: 0 }}>Libro Diario</h4>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '12px' }}>
                                  <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...bjInput, padding:'8px'}} />
                                  <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={{...bjInput, marginTop:'8px', padding:'8px'}} />
                                  <div style={{marginTop: '10px', display:'flex', gap:'10px'}}><button onClick={guardarCambiosFinanza} style={{backgroundColor:'#16A34A', color:'#fff', padding:'8px 15px', borderRadius:'10px', border:'none', cursor:'pointer'}}>OK</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'none', border:'none', cursor:'pointer'}}>X</button></div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '12px' }}><small style={{fontWeight:'bold', color:FUCSIA_PRINCIPAL}}>{f.tipo}</small><br/>{f.descripcion}</td>
                                <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold', color: f.tipo.includes('Ingreso') ? '#16A34A' : FUCSIA_PRINCIPAL }}>S/ {Number(f.monto).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '12px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("Borrar?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer'}}>🗑️</button>
                                </td>
                              </>
                            )}
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