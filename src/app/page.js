"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ==========================================
  // [1] UTILS Y AYUDANTES (HELPERS)
  // ==========================================

  // --- HORA EXACTA PERÚ (GMT-5) ---
  const getFechaPeru = (dateInput = new Date()) => {
    const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
    const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(new Date(dateInput));
    const anio = partes.find(p => p.type === 'year').value;
    const mes = partes.find(p => p.type === 'month').value;
    const dia = partes.find(p => p.type === 'day').value;
    return `${anio}-${mes}-${dia}`;
  };

  // --- LIMPIEZA DE DECIMALES (SOLUCIÓN A LA COMA PERUANA) ---
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return valor;
    // Cambiamos coma por punto y removemos basura no numérica
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // --- LÓGICA DE ETIQUETAS POR FECHA ---
  const getEtiquetaProducto = (createdAt) => {
    const fechaCreacion = new Date(createdAt);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));
    
    if (diferenciaDias <= 3) {
        return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
    } else if (diferenciaDias > 3 && diferenciaDias <= 8) {
        return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
    }
    return null;
  };

  // ==========================================
  // [2] ESTADOS DEL SISTEMA
  // ==========================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- BUSCADORES ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- FORMULARIO NUEVA VENTA ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- EDICIÓN DE CLIENTE EN HISTORIAL ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  
  // --- EDICIÓN DE GASTOS / FINANZAS ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  
  // --- FORMULARIOS GESTIÓN ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ==========================================
  // [3] CARGA DE DATOS Y TIEMPO REAL
  // ==========================================

  useEffect(() => {
    document.title = "B J Importaciones | Dashboard";
    cargarTodo();

    const canalVentas = supabase.channel('realtime-ventas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .subscribe();

    const canalProductos = supabase.channel('realtime-productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .subscribe();

    const canalFinanzas = supabase.channel('realtime-finanzas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalFinanzas);
    };
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

  // ==========================================
  // [4] LÓGICA DE NEGOCIO (MEMOS)
  // ==========================================

  // --- LOGÍSTICA: TODO LO QUE ESTÉ EN ALMACÉN SIN IMPORTAR LA FECHA ---
  const pendientesAlmacen = useMemo(() => {
    const pend = ventas.filter(v => v.estado_pedido === 'En Almacén');
    const grupos = {};
    pend.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) {
        grupos[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
      }
      grupos[key].items.push(v);
      grupos[key].totalVenta += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos);
  }, [ventas]);

  // --- VENTAS: AGRUPAR POR CLIENTE Y MINUTO PARA HISTORIAL ---
  const historialVentasHoy = useMemo(() => {
    const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
    const grupos = {};
    filtradas.forEach(v => {
      // Usamos los primeros 16 caracteres de created_at para agrupar ventas hechas en el mismo minuto
      const key = `${v.cliente_nombre}-${v.localidad}-${v.created_at.substring(0,16)}`; 
      if (!grupos[key]) {
        grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      }
      grupos[key].items.push(v);
      grupos[key].total += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos).reverse();
  }, [ventas, fechaConsulta]);

  // --- CAJA: TOTALES DEL DÍA ---
  const totalesCajaHoy = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      caja: vHoy.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
      ganancia: vHoy.reduce((acc, v) => acc + v.ganancia_total, 0)
    };
  }, [ventas]);

  // --- FINANZAS: BALANCE GLOBAL ---
  const balanceFinancieroGlobal = useMemo(() => {
    const egresos = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto), 0);
    const extras = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto), 0);
    const ventasBrutas = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    const gananciaNetaReal = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    return { 
        gastos: egresos, 
        ingresosExtras: extras, 
        gananciaNetaReal, 
        cajaActualEfectivo: ventasBrutas + extras - egresos 
    };
  }, [finanzas, ventas]);

  // --- INVENTARIO: VALORIZACIÓN DE CAPITAL ---
  const statsValorInventario = useMemo(() => {
    let costoTotal = 0; let ventaTotal = 0; let unidadesTotal = 0;
    productos.forEach(p => { 
      if (p.stock > 0) { 
        costoTotal += (Number(p.precio_compra) * p.stock); 
        ventaTotal += (Number(p.precio_venta) * p.stock); 
        unidadesTotal += p.stock; 
      } 
    });
    return { costoTotal, ventaTotal, unidadesTotal, gananciaPotencial: ventaTotal - costoTotal };
  }, [productos]);

  const dataGraficoRetorno = [
    { nombre: 'Inversión (Costo)', valor: statsValorInventario.costoTotal, fill: '#1E1B1C' },
    { nombre: 'Retorno (Venta)', valor: statsValorInventario.ventaTotal, fill: FUCSIA_PRINCIPAL }
  ];

  // ==========================================
  // [5] MANEJADORES DE EVENTOS (HANDLERS)
  // ==========================================

  // --- ACCIONES DE CARRITO ---
  const handleClienteChange = (e) => {
    const nom = e.target.value; setCliente(nom);
    const c = ventas.find(v => v.cliente_nombre.toLowerCase() === nom.toLowerCase());
    if (c) { setLocalidad(c.localidad || ''); setTelefono(c.telefono || ''); }
  };

  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const precioBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if (p.stock < cant + enC) return alert(`¡Error! No hay stock suficiente en almacén.`);
    
    setCarrito([...carrito, { 
      producto_id: p.id, 
      nombre: p.nombre, 
      cantidad: cant, 
      color: coloresElegidos[p.id], 
      precio_venta: precioBase, 
      precio_compra: p.precio_compra 
    }]);
  };

  const actualizarPrecioCarrito = (idx, valorBruto) => {
    const limpio = handleInputMonto(valorBruto);
    const nuevo = [...carrito];
    nuevo[idx].precio_venta = limpio;
    setCarrito(nuevo);
  };

  const finalizarVentaLote = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Por favor, ingresa el nombre del cliente y su zona.");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const totalBruto = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const ratioDesc = totalBruto > 0 ? (Number(descuento) / totalBruto) : 0;

    const inserts = carrito.map(i => {
      const pUnitario = Number(i.precio_venta);
      const subTotalItem = pUnitario * i.cantidad;
      const descuentoProporcional = subTotalItem * ratioDesc;
      return { 
        cliente_nombre: cliente, 
        localidad, 
        telefono: telefono || '', 
        producto_id: i.producto_id, 
        cantidad: i.cantidad, 
        color: i.color, 
        precio_venta_unitario: pUnitario, 
        precio_costo_unitario: i.precio_compra, 
        ganancia_total: ((pUnitario - i.precio_compra) * i.cantidad) - descuentoProportion, 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const item of carrito) {
        const prodOriginal = productos.find(p => p.id === item.producto_id);
        await supabase.from('productos').update({ stock: prodOriginal.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta realizada correctamente.");
    } else {
        alert("Error al guardar venta: " + error.message);
    }
  };

  // --- ACCIONES DE EDICIÓN HISTORIAL ---
  const prepararEdicionCliente = (grupo) => {
    setEditandoGrupoId(grupo.id_grupo);
    setFormEditCliente({ 
        nombre: grupo.cliente_nombre, 
        localidad: grupo.localidad, 
        telefono: grupo.telefono 
    });
  };

  const guardarCambiosCliente = async (grupo) => {
    for (const item of grupo.items) {
      await supabase.from('ventas').update({
        cliente_nombre: formEditCliente.nombre,
        localidad: formEditCliente.localidad,
        telefono: formEditCliente.telefono
      }).eq('id', item.id);
    }
    setEditandoGrupoId(null);
    alert("✅ Datos del cliente actualizados en el sistema.");
  };

  const borrarVentaUnitario = async (v) => {
    if (confirm("¿Anular esta unidad? El stock se devolverá al catálogo.")) {
      const p = productos.find(pr => pr.id === v.producto_id);
      if (p) await supabase.from('productos').update({ stock: p.stock + v.cantidad }).eq('id', p.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // --- ACCIONES DE GESTIÓN ---
  const cargarProductoNuevo = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre,
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)),
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock),
        colores: formProd.colores
    }]);
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Producto agregado al catálogo.");
    }
  };

  const actualizarStockRapido = async (p) => {
    const nuevoStock = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
    alert("✅ Stock sincronizado.");
  };

  const eliminarProductoDelSistema = async (p) => {
    if (confirm(`¿ELIMINAR DEFINITIVAMENTE "${p.nombre}"? No podrás recuperar el historial de este producto.`)) {
      await supabase.from('productos').delete().eq('id', p.id);
    }
  };

  const guardarEdicionGasto = async () => {
    const montoLimpio = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ 
        tipo: formEditFinanza.tipo, 
        descripcion: formEditFinanza.descripcion, 
        monto: Number(montoLimpio) 
    }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
    alert("✅ Registro actualizado.");
  };

  const exportarExcelCierre = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Localidad,Estado,Producto,Cantidad,Precio_Venta_Unit,Total_Venta\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const prodNom = productos.find(p=>p.id===v.producto_id)?.nombre || "N/A";
      csv += `${getFechaPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${v.estado_pedido},${prodNom},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_BJ_Importaciones_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ==========================================
  // [6] DISEÑO Y ESTILOS (UI)
  // ==========================================

  const inputBJ = { padding: '14px', borderRadius: '12px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const cardBJ = { backgroundColor: '#ffffff', borderRadius: '25px', padding: '25px', boxShadow: `0 15px 35px -5px rgba(247, 134, 193, 0.2)`, border: '1px solid #FFF1F2' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🟢 HEADER PRINCIPAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 5px 15px rgba(0,0,0,0.03)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, letterSpacing: '-0.5px' }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: 'bold', fontSize: '10px' }}>PANEL DE CONTROL MAESTRO</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '16px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '25px 15px' }}>
        
        {/* ============================================================================== */}
        {/* [SECCIÓN 1] VENTAS                                                             */}
        {/* ============================================================================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* INDICADORES SUPERIORES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={cardBJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 DINERO EN CAJA (HOY)</span>
                  <button onClick={exportarExcelCierre} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '8px 16px', borderRadius: '10px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>CIERRE DE CAJA</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3rem', fontWeight: '900', letterSpacing: '-1px' }}>S/ {totalesCajaHoy.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '15px', backgroundColor: '#F0FDF4', padding: '8px 15px', borderRadius: '10px', display: 'inline-block' }}>Ganancia Proyectada: S/ {totalesCajaHoy.ganancia.toFixed(2)}</div>
              </div>
              <div style={cardBJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 CONSULTAR HISTORIAL</span>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '5px 0' }}>Selecciona una fecha para ver las ventas pasadas.</p>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...inputBJ, marginTop: '10px' }} />
              </div>
            </div>

            {/* FORMULARIO DE VENTA */}
            <div style={{ ...cardBJ, border: `2px solid #FCA5D4`, backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.4rem', fontWeight: '900' }}>🛒 Registrar Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '14px', padding: '5px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B', transition: '0.3s' }}>PRECIO MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B', transition: '0.3s' }}>PRECIO MENOR</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ position:'relative' }}>
                    <input list="clientes_search" placeholder="👤 Nombre del Cliente" value={cliente} onChange={handleClienteChange} style={inputBJ} />
                    <datalist id="clientes_search">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                </div>
                <input placeholder="📱 WhatsApp (999 999 999)" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputBJ} />
                <input placeholder="📍 Zona / Distrito / Pueblo" value={localidad} onChange={e => setLocalidad(e.target.value)} style={inputBJ} />
              </div>

              {/* CARRITO VISUAL */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '22px', padding: '25px', marginBottom: '30px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: FUCSIA_PRINCIPAL }}>RESUMEN DEL CARRITO:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {carrito.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', borderBottom: '1px solid #FCC2E2', paddingBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E1B1C', fontSize: '16px' }}>{item.cantidad}x</strong> {item.nombre} 
                            <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '800', textTransform: 'uppercase', fontSize: '10px' }}>Color: {item.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', padding: '6px 12px', borderRadius: '12px', border: '1px solid #FCA5D4' }}>
                             <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94A3B8' }}>S/</span>
                             <input 
                                type="text" 
                                value={item.precio_venta} 
                                onChange={(e) => actualizarPrecioCarrito(idx, e.target.value)} 
                                style={{ width: '70px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '15px', fontWeight: '900', color: '#1E1B1C' }} 
                             />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(247, 134, 193, 0.3)' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '25px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748B' }}>DESCUENTO FINAL: S/</span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '100px', padding: '10px', borderRadius: '12px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize: '16px' }} />
                    </div>
                    <h3 style={{ margin: '10px 0', fontSize: '2rem', color: '#1E1B1C', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                    <button onClick={() => finalizarVentaLote('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', fontSize: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)', transition: '0.2s' }}>✅ COMPLETAR Y ENTREGAR</button>
                    <button onClick={() => finalizarVentaLote('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', fontSize: '15px', boxShadow: `0 10px 20px ${FUCSIA_PRINCIPAL}40`, transition: '0.2s' }}>📦 PAGADO - GUARDAR ALMACÉN</button>
                  </div>
                </div>
              )}

              {/* BUSCADOR DE CATÁLOGO */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <input placeholder="🔍 Busca por modelo, marca o tipo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputBJ, paddingLeft: '50px', height: '60px', fontSize: '17px' }} />
                <span style={{ position: 'absolute', left: '18px', top: '18px', fontSize: '1.5rem' }}>🔍</span>
              </div>

              {/* REJILLA DE PRODUCTOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', maxHeight: '600px', overflowY: 'auto', padding: '10px' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const etiqueta = getEtiquetaProducto(p.created_at);
                  const precioActual = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const lowStock = p.stock < 5;

                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '20px', borderRadius: '28px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', transition: '0.3s' }}>
                      {etiqueta && <span style={{ position:'absolute', top: '-12px', left: '15px', backgroundColor: etiqueta.color, color: '#fff', fontSize: '10px', padding: '5px 12px', borderRadius: '14px', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>{etiqueta.tipo} {etiqueta.icono}</span>}
                      
                      <strong style={{ display: 'block', height: '42px', overflow: 'hidden', fontSize: '15px', lineHeight: '1.3', color: '#1E1B1C', marginBottom: '10px' }}>{p.nombre}</strong>
                      
                      <div style={{ margin: '12px 0', padding: '8px', backgroundColor: lowStock ? '#FFF1F2' : '#F0FDF4', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: lowStock ? '#E11D48' : '#16A34A' }}>DISPONIBLE: {p.stock}</span>
                      </div>

                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...inputBJ, padding: '8px', fontSize: '13px', marginBottom: '15px', border: '1px solid #E2E8F0', height: '40px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', fontWeight: '900', fontSize: '18px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '18px', minWidth: '20px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', fontWeight: '900', fontSize: '18px' }}>+</button>
                      </div>

                      <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '15px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', cursor:'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {p.stock > 0 ? `AGREGAR S/ ${Number(precioActual).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL GRUPAL CON EDICIÓN DE CLIENTE */}
            <div style={cardBJ}>
              <h4 style={{ margin: 0, marginBottom: '25px', color: '#64748B', fontSize: '13px', letterSpacing: '1.5px', fontWeight: '900' }}>VENTAS DEL DÍA SELECCIONADO</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {historialVentasHoy.length === 0 ? <p style={{textAlign:'center', opacity:0.5}}>No hay registros para esta fecha.</p> : historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '28px', border: `1px solid #FCC2E2`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '18px' }}>
                         <label style={{ fontSize: '11px', fontWeight: 'bold', color: FUCSIA_PRINCIPAL }}>EDITAR NOMBRE CLIENTE:</label>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={inputBJ} />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: FUCSIA_PRINCIPAL }}>ZONA/PUEBLO:</label>
                                <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={inputBJ} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: FUCSIA_PRINCIPAL }}>WHATSAPP:</label>
                                <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={inputBJ} />
                            </div>
                         </div>
                         <div style={{ display:'flex', gap:'10px', marginTop:'10px' }}>
                            <button onClick={() => guardarCambiosCliente(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', border:'none', padding:'15px', borderRadius:'12px', flex:1, fontWeight:'900', cursor:'pointer' }}>GUARDAR CAMBIOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', border:'none', padding:'15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>CANCELAR</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                          <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '20px', fontWeight: '900' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '11px' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '8px 18px', borderRadius: '14px', fontWeight: '900', fontSize: '16px', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)' }}>S/ {grupo.total.toFixed(2)}</div>
                           <button onClick={() => prepararEdicionCliente(grupo)} title="Editar datos del cliente" style={{ border:'none', background:'#fff', padding:'10px', borderRadius:'12px', cursor:'pointer', border:'2px solid #FCC2E2', fontSize: '1.2rem' }}>✏️</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '14px' }}>
                                <strong style={{ color: '#1E1B1C' }}>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre} 
                                <br/><small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 EN ALMACÉN' : '✅ ENTREGADO'}</small>
                            </div>
                            <div style={{ display:'flex', gap:'15px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '15px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => borrarVentaUnitario(v)} title="Anular ítem" style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '20px' }}>🗑️</button>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* [SECCIÓN 2] LOGÍSTICA (ALMACÉN GLOBAL)                                         */}
        {/* ============================================================================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ ...cardBJ, backgroundColor: '#1E1B1C', color: '#fff', padding: '40px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>📦 Gestión de Entregas</h2>
                <p style={{ opacity: 0.7, fontSize: '16px', marginTop: '10px' }}>Aquí visualizas toda la mercadería pagada que aún no ha sido retirada del almacén.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '25px' }}>
                {pendientesAlmacen.length === 0 ? (
                    <div style={{textAlign:'center', padding:'100px', opacity:0.3, gridColumn: '1/-1'}}><h3>¡Almacén vacío! Todos los pedidos han sido entregados. ✨</h3></div>
                ) : pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...cardBJ, borderLeft: `12px solid ${FUCSIA_PRINCIPAL}`, transition: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.6rem', fontWeight: '900' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '14px', color: '#64748B', fontWeight:'900', margin: '5px 0', textTransform: 'uppercase' }}>📍 {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Te saluda Jean de B J Importaciones. Te recordamos que tienes un pedido pendiente por recoger en nuestro local. ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '14px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 5px 15px rgba(37, 211, 102, 0.3)' }}>NOTIFICAR 📱</button>
                        </div>
                        
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '22px', padding: '20px', marginBottom: '25px', border: '1px solid #E2E8F0' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', padding: '10px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                                    <span><strong style={{ color: '#1E1B1C' }}>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre} <br/><small style={{ fontWeight: 'bold', color: FUCSIA_PRINCIPAL }}>Color: {it.color}</small></span>
                                    <strong style={{ alignSelf: 'center', fontSize: '16px' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'20px', borderTop:'3px solid #E2E8F0', paddingTop: '15px'}}>
                                <small style={{ fontWeight:'900', color: '#64748B', textTransform:'uppercase' }}>Total Pagado: </small>
                                <strong style={{ color: '#16A34A', fontSize:'1.5rem', fontWeight: '900' }}>S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        
                        <button onClick={async () => { 
                            if(confirm(`¿Confirmas la entrega física de todo el pedido a ${grupo.cliente}?`)) { 
                                for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); 
                                alert("¡Pedido entregado con éxito!"); 
                            } 
                        }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', fontSize: '15px', transition: '0.2s', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
                            ✅ MARCAR TODO COMO ENTREGADO
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* [SECCIÓN 3] GESTIÓN Y CONTABILIDAD                                             */}
        {/* ============================================================================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* PANEL DE VALORIZACIÓN DE CAPITAL */}
            <div style={{ ...cardBJ, border: `3px solid ${FUCSIA_PRINCIPAL}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05 }}>📊</div>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontSize: '1.5rem', fontWeight: '900' }}>💎 Valorización de Inventario Real</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '25px', borderRadius: '22px', border: '1px solid #E2E8F0' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Inversión en Stock (Costo)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.2rem', fontWeight: '900' }}>S/ {statsValorInventario.costoTotal.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Capital "parado" en mercadería física.</p>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '25px', borderRadius: '22px', border: `1px solid ${FUCSIA_PRINCIPAL}40` }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Retorno Proyectado (Venta)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.2rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {statsValorInventario.ventaTotal.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#F786C1' }}>Dinero a recibir vendiendo todo a Mayorista.</p>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '25px', borderRadius: '22px', border: '1px solid #BBF7D0' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Utilidad en Espera</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.2rem', fontWeight: '900', color: '#16A34A' }}>S/ {statsValorInventario.gananciaPotencial.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#16A34A' }}>Ganancia neta tras liquidar inventario.</p>
                    </div>
                </div>
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#1E1B1C', color: '#fff', display: 'inline-block', padding: '10px 25px', borderRadius: '15px', fontWeight: '900', fontSize: '14px' }}>
                       {statsValorInventario.unidadesTotal} UNIDADES TOTALES EN TIENDA
                    </div>
                </div>
            </div>

            {/* BALANCE FINANCIERO RÁPIDO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div style={{ ...cardBJ, borderLeft: `8px solid ${FUCSIA_PRINCIPAL}`, padding: '15px 25px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '10px' }}>GASTOS Y COMPRAS</small>
                <h4 style={{ fontSize: '1.6rem', margin: '5px 0', fontWeight: '900' }}>S/ {balanceFinancieroGlobal.gastos.toFixed(2)}</h4>
              </div>
              <div style={{ ...cardBJ, borderLeft: '8px solid #16A34A', padding: '15px 25px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '10px' }}>INGRESOS ADICIONALES</small>
                <h4 style={{ fontSize: '1.6rem', margin: '5px 0', fontWeight: '900' }}>S/ {balanceFinancieroGlobal.ingresosExtras.toFixed(2)}</h4>
              </div>
              <div style={{ ...cardBJ, borderLeft: '8px solid #3B82F6', padding: '15px 25px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '10px' }}>GANANCIA NETA REAL</small>
                <h4 style={{ fontSize: '1.6rem', margin: '5px 0', fontWeight: '900' }}>S/ {balanceFinancieroGlobal.gananciaNetaReal.toFixed(2)}</h4>
              </div>
              <div style={{ ...cardBJ, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '15px 25px' }}>
                <small style={{ fontWeight: '900', fontSize: '10px' }}>EFECTIVO EN CAJA</small>
                <h4 style={{ fontSize: '1.6rem', margin: '5px 0', fontWeight: '900' }}>S/ {balanceFinancieroGlobal.cajaActualEfectivo.toFixed(2)}</h4>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
              
              {/* COLUMNA IZQUIERDA: FORMULARIOS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* REGISTRAR GASTO */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900' }}>💸 Movimiento de Caja (Egresos/Ingresos)</h4>
                  <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(handleInputMonto(formFinanzas.monto))}]); setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); alert("Movimiento guardado."); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={inputBJ}>
                      <option value="Gasto Local">🏪 Gasto Local (Servicios, Alquiler)</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Compra de Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal (Dueño)</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional (Ventas externas)</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial (Capital)</option>
                    </select>
                    <input placeholder="Descripción breve" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={inputBJ} />
                    <input type="text" placeholder="Monto S/ (Ej: 25.50)" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={inputBJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '900', cursor:'pointer', fontSize: '14px' }}>GUARDAR MOVIMIENTO</button>
                  </form>
                </div>
                
                {/* CARGAR PRODUCTO */}
                <div style={{ ...cardBJ, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900' }}>🆕 Cargar Nuevo Modelo al Catálogo</h4>
                  <form onSubmit={cargarProductoNuevo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Completo del Producto" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={inputBJ} />
                    <input placeholder="Variantes de Color (Ej: Rojo, Negro, Dorado)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={inputBJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{fontSize:'10px', fontWeight:'900', color:'#64748B', marginLeft:'10px'}}>COSTO S/</label>
                            <input type="text" placeholder="Costo" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={inputBJ} />
                        </div>
                        <div>
                            <label style={{fontSize:'10px', fontWeight:'900', color:'#64748B', marginLeft:'10px'}}>STOCK INICIAL</label>
                            <input type="number" placeholder="Cantidad" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={inputBJ} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{fontSize:'10px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'10px'}}>P. MAYORISTA S/</label>
                            <input type="text" placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...inputBJ, border:'2px solid #F786C1'}} />
                        </div>
                        <div>
                            <label style={{fontSize:'10px', fontWeight:'900', color:'#1E1B1C', marginLeft:'10px'}}>P. MINORISTA S/</label>
                            <input type="text" placeholder="Venta Menor" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...inputBJ, border:'2px solid #1E1B1C'}} />
                        </div>
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '15px', marginTop: '10px' }}>REGISTRAR PRODUCTO NUEVO</button>
                  </form>
                </div>
              </div>

              {/* COLUMNA DERECHA: EDICIÓN Y GRÁFICOS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* AJUSTE DE STOCK */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '20px', fontWeight: '900' }}>🔧 Ajuste Rápido de Stock</h4>
                  <input placeholder="🔍 Buscar para editar stock o borrar..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...inputBJ, padding: '12px', marginBottom: '20px', border: `2px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const tag = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '18px', border: '1px solid #f1f1f1', borderRadius: '22px', backgroundColor: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                              <div style={{ flex:1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {tag && <span style={{ backgroundColor: tag.color, color:'#fff', fontWeight: '900', fontSize: '9px', padding: '3px 8px', borderRadius: '10px' }}>{tag.icono} {tag.tipo}</span>}
                                    <strong style={{ fontSize: '14px', color: '#1E1B1C' }}>{p.nombre}</strong>
                                 </div>
                                 <small style={{ color: '#64748B', fontWeight: 'bold' }}>Costo: S/ {p.precio_compra} | Mayor: S/ {p.precio_venta}</small>
                              </div>
                              <button onClick={() => eliminarProductoDelSistema(p)} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '1.5rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '16px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748B' }}>STOCK ACTUAL:</span>
                              <input 
                                type="number" 
                                value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} 
                                onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} 
                                style={{ width: '80px', padding: '8px', borderRadius: '12px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '15px', fontWeight: '900', outline: 'none' }} 
                              />
                              <button onClick={() => actualizarStockRapido(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', cursor:'pointer', flex: 1 }}>OK</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LIBRO DIARIO CON CRUD COMPLETO */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '900' }}>📖 Libro Diario de Gastos / Ingresos</h4>
                  <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #F1F5F9' }}>
                           <th style={{ padding: '10px 5px' }}>MOVIMIENTO</th>
                           <th style={{ padding: '10px 5px', textAlign: 'right' }}>MONTO</th>
                           <th style={{ padding: '10px 5px', textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '20px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={{...inputBJ, padding:'8px'}}>
                                          <option value="Gasto Local">Gasto Local</option>
                                          <option value="Inversión (Mercadería)">Inversión (Mercadería)</option>
                                          <option value="Retiro Personal">Retiro Personal</option>
                                          <option value="Ingreso Adicional">Ingreso Adicional</option>
                                          <option value="Inversión Inicial">Inversión Inicial</option>
                                      </select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...inputBJ, padding:'8px'}} placeholder="Descripción" />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={{...inputBJ, padding:'8px'}} placeholder="Monto S/" />
                                      <div style={{display:'flex', gap:'10px'}}>
                                          <button onClick={guardarEdicionGasto} style={{backgroundColor:'#16A34A', color:'#fff', padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer', flex:1, fontWeight:'900'}}>ACTUALIZAR</button>
                                          <button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer', fontWeight:'900'}}>X</button>
                                      </div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '15px 5px' }}>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase', fontSize: '9px'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '500' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '15px 5px', fontWeight: '900', fontSize: '15px', color: f.tipo.includes('Ingreso') ? '#16A34A' : '#1E1B1C' }}>
                                    S/ {Number(f.monto).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '15px 5px' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'#F1F5F9', border:'none', padding:'8px', borderRadius:'10px', cursor:'pointer', fontSize: '1rem'}}>✏️</button>
                                      <button onClick={async ()=> { if(confirm("¿Borrar este movimiento definitivamente?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'#FFF1F2', border:'none', color: FUCSIA_PRINCIPAL, padding:'8px', borderRadius:'10px', cursor:'pointer', fontSize: '1rem'}}>🗑️</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO RECHARTS COMPLETO */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '20px', fontWeight: '900' }}>📈 Comparativa de Inversión vs Retorno</h4>
                  <div style={{ height: '280px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGraficoRetorno} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="nombre" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} />
                        <YAxis fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip 
                            formatter={(val)=> `S/ ${val.toLocaleString()}`} 
                            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                        />
                        <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '15px', padding: '15px', backgroundColor: '#F0FDF4', borderRadius: '18px' }}>
                    <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '10px' }}>Margen Bruto de Seguridad: </small>
                    <strong style={{ color: '#16A34A', fontSize: '1.2rem', display: 'block' }}>+ S/ {statsValorInventario.gananciaPotencial.toLocaleString()}</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}