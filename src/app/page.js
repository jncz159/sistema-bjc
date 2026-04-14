"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] HELPERS DE SEGURIDAD (PROTOCOLO ANTICRASH)
  // ============================================================

  // Garantiza que la fecha nunca sea nula para no romper los filtros
  const getFechaPeru = (dateInput) => {
    try {
        const fechaObj = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(fechaObj.getTime())) {
            const fallback = new Date();
            return fallback.toISOString().split('T')[0];
        }
        const configFecha = { 
            timeZone: "America/Lima", 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        const formateador = new Intl.DateTimeFormat('en-CA', configFecha);
        const partes = formateador.formatToParts(fechaObj);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (err) { 
        return new Date().toISOString().split('T')[0]; 
    }
  };

  // Formato de hora seguro para historial y libro diario
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "--:--";
        const configHora = { 
            timeZone: "America/Lima", 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        };
        return d.toLocaleTimeString('es-PE', configHora);
    } catch (e) { 
        return "--:--"; 
    }
  };

  // Limpiador estricto de números para evitar errores NaN en la base de datos
  const handleInputMonto = (valor) => {
    if (valor === undefined || valor === null) return "";
    const texto = String(valor);
    let paso1 = texto.replace(',', '.');
    let paso2 = paso1.replace(/[^0-9.]/g, '');
    return paso2;
  };

  // Lógica de etiquetas de antigüedad para el inventario
  const getEtiquetaProducto = (createdAt) => {
    if (!createdAt) return null;
    try {
        const creacion = new Date(createdAt);
        const hoy = new Date();
        const milisegundosPorDia = 1000 * 60 * 60 * 24;
        const diferenciaDias = Math.floor((hoy - creacion) / milisegundosPorDia);
        
        if (diferenciaDias <= 3) {
            return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
        } else if (diferenciaDias > 3 && diferenciaDias <= 8) {
            return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        }
        return null;
    } catch (e) { 
        return null; 
    }
  };

  // ============================================================
  // [BLOQUE 2] ESTADOS DEL SISTEMA (ALMACÉN REACTIVO)
  // ============================================================

  // Datos principales de la base de datos
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // Estados de carga y navegación
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  // Buscadores y filtros de fecha
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Memoria de la Venta que se está realizando
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados para procesos de edición (Historial)
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Estados para procesos de gestión (Dinero y Stock)
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';
  const VERDE_EXITO = '#16A34A';
  const ROJO_ALERTA = '#E11D48';
  const AMARILLO_AVISO = '#CA8A04';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (SUPABASE REALTIME)
  // ============================================================

  useEffect(() => {
    const arrancarSistema = async () => {
        await cargarTodoDesdeNube();
        setCargando(false);
    };
    arrancarSistema();

    // Sincronización bidireccional en tiempo real para las 3 tablas
    const canalVentas = supabase.channel('v47-sales').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeNube()).subscribe();
    const canalProductos = supabase.channel('v47-prod').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeNube()).subscribe();
    const canalFinanzas = supabase.channel('v47-fin').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeNube()).subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalFinanzas);
    };
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: pData } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: vData } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: fData } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        
        if (pData) setProductos(pData);
        if (vData) setVentas(vData);
        if (fData) setFinanzas(fData);
    } catch (error) { 
        console.error("Error crítico de sincronización:", error); 
    }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA DE NEGOCIO (MEMOS ANALÍTICOS Y BLINDADOS)
  // ============================================================

  // 📦 4.1 LOGÍSTICA: Clasificación por entrega física y cobranza de deudas
  const logisticaInteligente = useMemo(() => {
    if (!ventas || ventas.length === 0) return { almacen: [], cuentasPorCobrar: [] };
    try {
        const gAlmacen = {}; const gCuentas = {};
        ventas.forEach(v => {
            if (!v) return;
            const llaveAgrupacion = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}`;
            
            // Caso 1: Mercadería pagada pero no retirada
            if (v.estado_pedido === 'En Almacén') {
                if (!gAlmacen[llaveAgrupacion]) {
                    gAlmacen[llaveAgrupacion] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                }
                gAlmacen[llaveAgrupacion].items.push(v);
                gAlmacen[llaveAgrupacion].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            
            // Caso 2: Mercadería entregada (o por entregar) pero no pagada (Crédito)
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!gCuentas[llaveAgrupacion]) {
                    gCuentas[llaveAgrupacion] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                }
                gCuentas[llaveAgrupacion].items.push(v);
                gCuentas[llaveAgrupacion].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });
        return { almacen: Object.values(gAlmacen), cuentasPorCobrar: Object.values(gCuentas) };
    } catch (e) { 
        return { almacen: [], cuentasPorCobrar: [] }; 
    }
  }, [ventas]);

  // 📝 4.2 HISTORIAL: Procesamiento de ventas diarias con protección de hora
  const historialVentasMaster = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const filtradas = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const gruposFinales = {};
        filtradas.forEach(v => {
            const hCorte = (v.created_at || "").substring(0,16);
            const llaveUnica = `${v.cliente_nombre || 'S'}-${v.localidad || 'Z'}-${hCorte}`; 
            if (!gruposFinales[llaveUnica]) {
                gruposFinales[llaveUnica] = { id_grupo: llaveUnica, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            gruposFinales[llaveUnica].items.push(v);
            gruposFinales[llaveUnica].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(gruposFinales).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // 💰 4.3 BALANCE BUNKER: División estricta de Capital vs Ganancias
  const balanceFinancieroMaster = useMemo(() => {
    try {
        const fL = finanzas || [];
        const vL = ventas || [];
        const hoyStr = getFechaPeru();
        
        // Ventas que ya son dinero en mano hoy
        const vHoyLiquidas = vL.filter(v => v && getFechaPeru(v.created_at) === hoyStr && v.estado_pedido !== 'Pendiente de Pago');
        
        // BÓVEDA DE GANANCIAS: Utilidad real acumulada históricamente
        const gananciaBrutaAcumulada = vL.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retirosEjecutadosDesdeGanancias = fL.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // CAJA GLOBAL: Todo el dinero físico que hay (Capital Invertido + Ventas Pagadas - Gastos)
        const totalVentasPagadasEfectivo = vL.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const totalDineroExtraInyectado = fL.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const totalTodosLosGastosHechos = fL.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // PUNTO DE EQUILIBRIO MENSUAL: ¿Las utilidades ya cubren los gastos?
        const mesActualID = hoyStr.substring(0,7);
        const metaGastosMes = fL.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mesActualID && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const utilidadesVentasMes = vL.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mesActualID && v.estado_pedido !== 'Pendiente de Pago').reduce((a,b) => a + (Number(b.ganancia_total) || 0), 0);

        return { 
            cajaHoy: vHoyLiquidas.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vHoyLiquidas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cajaGlobalReal: (totalVentasPagadasEfectivo + totalDineroExtraInyectado - totalEgresosGlobales),
            disponibleBoveda: (gananciaBrutaAcumulada - retirosEjecutadosDesdeGanancias),
            pe_progreso: metaGastosMes > 0 ? (utilidadesVentasMes / metaGastosMes) * 100 : (utilidadesVentasMes > 0 ? 100 : 0),
            pe_ganRealActual: utilidadesVentasMes,
            pe_gastosMeta: metaGastosMes,
            totalEgresosGlobales: totalEgresosGlobales // Helper para el cálculo de cajaGlobal
        };
    } catch (e) { 
        console.error("Error balance:", e);
        return { cajaHoy: 0, ganHoy: 0, cajaGlobalReal: 0, disponibleBoveda: 0, pe_progreso:0, pe_ganRealActual:0, pe_gastosMeta:0 }; 
    }
  }, [finanzas, ventas]);

  // 🏆 4.4 ANALÍTICA: Identificación de Estrellas y Capital Dormido
  const analyticsBJMaster = useMemo(() => {
    try {
        // Ranking Rentabilidad
        const diccionarioPrecios = {};
        (ventas || []).forEach(v => {
            if (!v) return;
            const productoOriginal = productos.find(p => p.id === v.producto_id);
            const nombreM = productoOriginal ? productoOriginal.nombre : "Modelo Eliminado";
            diccionarioPrecios[nombreM] = (diccionarioPrecios[nombreM] || 0) + Number(v.ganancia_total || 0);
        });
        const ranking = Object.entries(diccionarioPrecios).sort((a,b) => b[1] - a[1]).slice(0, 5);

        // Alerta de Dinero Dormido (+20 días)
        const diaHoy = new Date();
        const dormidos = (productos || []).filter(p => {
            if (!p) return false;
            const historialDeVentasP = (ventas || []).filter(v => v && v.producto_id === p.id);
            const ultimaVentaP = historialDeVentasP.pop();
            if (!ultimaVentaP) return true; // Nunca se vendió
            const diferenciaMilis = diaHoy - new Date(ultimaVentaP.created_at);
            const diferenciaDias = Math.floor(diferenciaMilis / (1000 * 60 * 60 * 24));
            return diferenciaDias > 20 && p.stock > 0;
        }).slice(0, 5);

        return { ranking, dormidos };
    } catch (err) { return { ranking: [], dormidos: [] }; }
  }, [ventas, productos]);

  // 📉 4.5 VALORIZACIÓN: Capital en Mercadería
  const valorizacionInventario = useMemo(() => {
    let costoTotalAlmacen = 0; let retornoVentaAlmacen = 0;
    (productos || []).forEach(p => { 
        if (!p) return;
        const stockActual = Number(p.stock || 0);
        if (stockActual > 0) { 
            costoTotalAlmacen += (Number(p.precio_compra || 0) * stockActual); 
            retornoVentaAlmacen += (Number(p.precio_venta || 0) * stockActual); 
        } 
    });
    return { costoTotalAlmacen, retornoVentaAlmacen, utilPotencial: retornoVentaAlmacen - costoTotalAlmacen };
  }, [productos]);

  const seriesGraficoROI = [
    { name: 'Costo Invertido', value: valorizacionInventario.costoTotalAlmacen || 0, fill: '#1E1B1C' },
    { name: 'Retorno Estimado', value: valorizacionInventario.retornoVentaAlmacen || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (LÓGICA OPERATIVA)
  // ============================================================

  // Agregado al carrito con validación de stock físico
  const handleAgregarAlCarritoMaster = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const precioBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const unidadesYaEnCarrito = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    
    if ((Number(p.stock) || 0) < c + unidadesYaEnCarrito) return alert("¡Atención! No hay suficiente stock físico para esta cantidad.");
    
    setCarrito([...carrito, { 
        producto_id: p.id, 
        nombre: p.nombre, 
        cantidad: c, 
        color: (coloresElegidos[p.id] || "Único"), 
        precio_venta: precioBase, 
        precio_compra: p.precio_compra 
    }]);
  };

  // Autocompletado de clientes recurrentes de Chiclayo
  const handleSeleccionarClienteAuto = (e) => {
    const v = e.target.value; setCliente(v);
    const m = (ventas || []).find(ven => ven && ven.cliente_nombre?.toLowerCase() === v.toLowerCase());
    if (m) { setLocalidad(m.localidad || ''); setTelefono(m.telefono || ''); }
  };

  // Proceso de guardado de venta con selección de estado
  const handleGuardarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Error: Faltan datos obligatorios (Cliente o Zona).");
    if (carrito.length === 0) return alert("Error: El carrito está vacío.");
    
    const totalVentaC = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const factorD = totalVentaC > 0 ? (Number(descuento) / totalVentaC) : 0;

    const itemsParaInsertar = carrito.map(i => {
        const pv = Number(i.precio_venta);
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, 
            precio_costo_unitario: Number(i.precio_compra ?? 0), 
            ganancia_total: ((pv - Number(i.precio_compra ?? 0)) * i.cantidad) - ((pv * i.cantidad) * factorD), 
            estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(itemsParaInsertar);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); 
      alert("✅ Operación registrada exitosamente.");
    }
  };

  // Liquidación de deudas en Logística
  const handleLiquidarDeuda = async (grupoDeudor) => {
    if(confirm(`¿Registrar pago total de S/ ${grupoDeudor.total.toFixed(2)} del cliente ${grupoDeudor.cliente}?`)) {
        for(let item of grupoDeudor.items) { 
            await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', item.id); 
        }
        alert("💰 Saldo cobrado. El dinero ha entrado a tu caja global.");
    }
  };

  // Envío de Ticket vía WhatsApp
  const handleEnviarWhatsAppTicket = (grupo) => {
    let mensaje = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de tu compra en BJ Importaciones Chiclayo.%0A%0A`;
    grupo.items.forEach(v => {
        const pOriginal = productos.find(p => p.id === v.producto_id);
        mensaje += `- *${v.cantidad}x* ${pOriginal?.nombre || 'Producto'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    mensaje += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias por tu preferencia! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${mensaje}`, '_blank');
  };

  // Corrección de cantidades en el historial con actualización de stock
  const handleEditarCantidadVendida = async (v) => {
    const diff = nuevaCantVenta - v.cantidad;
    const pCat = productos.find(p => p.id === v.producto_id);
    if (pCat && pCat.stock < diff) return alert("Error: Stock insuficiente para aumentar la cantidad.");
    
    const { error } = await supabase.from('ventas').update({ 
        cantidad: nuevaCantVenta, 
        ganancia_total: (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta 
    }).eq('id', v.id);

    if (!error) {
        if (pCat) await supabase.from('productos').update({ stock: pCat.stock - diff }).eq('id', pCat.id);
        setIdItemVentaEditando(null); alert("✅ Cantidad actualizada correctamente.");
    }
  };

  // Anulación de venta (Borrado físico + Retorno de stock)
  const handleAnularVentaCompleta = async (v) => {
    if (confirm("¿Seguro que quieres anular este ítem? El stock será devuelto al catálogo.")) {
      const pInventario = productos.find(pr => pr.id === v.producto_id);
      if (pInventario) await supabase.from('productos').update({ stock: pInventario.stock + v.cantidad }).eq('id', pInventario.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // Registro de gastos y retiros (Con discriminación de fondo)
  const handleRegistrarFinanzaManual = async (e) => {
    e.preventDefault();
    const montoLimpio = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, 
        descripcion: formFinanzas.descripcion, 
        monto: Number(montoLimpio), 
        origen: formFinanzas.origen 
    }]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); 
    alert("✅ Movimiento registrado en el Libro Diario.");
  };

  const handleSincronizarStockIndividual = async (p) => {
    const nuevoS = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: nuevoS }).eq('id', p.id); 
    alert("✅ Stock sincronizado.");
  };

  const handleExportarExcelCajaCompleto = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const pNom = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${pNom},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const linkE = document.createElement("a"); 
    linkE.setAttribute("href", encodeURI(csv));
    linkE.setAttribute("download", `CIERRE_BJ_${fechaConsulta}.csv`); 
    document.body.appendChild(linkE); 
    linkE.click();
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (VISUAL UI EXPANDIDA)
  // ============================================================

  const s_Input_Base = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const s_Card_Base = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        <div style={{ marginBottom:'20px' }}>💎</div>
        BUNKER BJ MAESTRO v47... 🚀
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 CABECERA DE NAVEGACIÓN FULL */}
      <header style={{ backgroundColor: '#ffffff', padding: '18px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>CHICLAYO • MAESTRO v47 PLATINUM</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== TRAMO 1: VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* WIDGETS DE CAJA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={s_Card_Base}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCajaCompleto} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceFinancieroMaster.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: VERDE_EXITO, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceFinancieroMaster.ganHoy.toFixed(2)}</div>
              </div>
              <div style={s_Card_Base}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...s_Input_Base, marginTop: '15px' }} />
              </div>
            </div>

            {/* FORMULARIO DE PEDIDO */}
            <div style={{ ...s_Card_Base, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Nueva Operación de Venta</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYORISTA</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="lista_clientes_auto" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleSeleccionarClienteAuto} style={s_Input_Base} />
                <datalist id="lista_clientes_auto">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={s_Input_Base} />
                <input placeholder="📍 Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={s_Input_Base} />
              </div>

              {/* CARRITO VISUAL */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>VARIACIÓN: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '12px', border: '1px solid #FCA5D4' }}>
                           <span style={{ fontSize: '14px', fontWeight: '900' }}>S/</span>
                           <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        </div>
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DESCUENTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => handleGuardarVentaBJ('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => handleGuardarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => handleGuardarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...s_Input_Base, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tagP = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tagP && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tagP.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tagP.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: p.stock < 5 ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock} U.</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...s_Input_Base, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px' }}>+</button>
                      </div>
                      <button onClick={() => handleAgregarAlCarritoMaster(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={bjCardStyle}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Ventas Realizadas Histórico</h4>
                {historialVentasMaster.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ {grupo.hora}</small>
                                <br/><strong style={{ color: '#1E1B1C', fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => handleEnviarWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900' }}>TICKET 📱</button>
                                <button onClick={() => {setEditandoGrupoId(grupo.id_grupo); setFormEditCliente({nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono});}} style={{ border:'none', background:'#fff', padding:'10px', borderRadius:'12px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    {idItemVentaEditando === v.id ? (
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input type="number" value={nuevaCantVenta} onChange={(e)=>setNuevaCantVenta(Number(e.target.value))} style={{width:'60px', padding:'5px', borderRadius:'8px', border:'1px solid #ccc'}} />
                                            <button onClick={()=>handleEditarCantidadVendida(v)} style={{background:VERDE_BJ, color:'#fff', border:'none', borderRadius:'8px', padding:'5px 10px'}}>OK</button>
                                        </div>
                                    ) : (
                                        <small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | {v.estado_pedido}</small>
                                    )}
                                </div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=> {setIdItemVentaEditando(v.id); setNuevaCantVenta(v.cantidad);}} style={{border:'none', background:'none', color:'#64748B', fontSize:'10px', textDecoration:'underline'}}>Editar</button>
                                    <button onClick={()=>handleAnularVentaCompleta(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold'}}>🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== TRAMO 2: LOGÍSTICA ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...bjCardStyle, backgroundColor: '#1E1B1C', color: '#fff', padding: '40px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>📦 Operaciones Logísticas BJ</h2>
                <p style={{opacity:0.7}}>Control físico de almacén y cobros pendientes por crédito.</p>
            </div>
            
            <div style={bjCardStyle}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Mercadería Guardada (Ya Pagada)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '25px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `¡Hola *${grupo.cliente}*! 👋 BJ Importaciones te avisa que tu pedido está listo para retirar. ✨📦`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <div style={{marginBottom:'15px'}}>{grupo.items.map((it,i) => <div key={i}><small>{it.cantidad}x {it.color}</small></div>)}</div>
                            <button onClick={async () => { if(confirm("¿Entregaste el pedido?")) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CONFIRMAR ENTREGA ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...bjCardStyle, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.cuentasPorCobrar.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small>
                            <h4 style={{color:AMARILLO_AVISO, margin:'10px 0'}}>SALDO PENDIENTE: S/ {grupo.total.toFixed(2)}</h4>
                            <button onClick={() => handleLiquidarDeuda(grupo)} style={{ width: '100%', backgroundColor: VERDE_EXITO, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO (COBRAR)</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== TRAMO 3: GESTIÓN (BUNKER) ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* PANEL DE ANALÍTICA SUPERIOR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                {/* PUNTO DE EQUILIBRIO */}
                <div style={bjCardStyle}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (GANANCIA REAL VENTAS)</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceFinancieroMaster.pe_progreso}%`, backgroundColor:VERDE_EXITO, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Ganancia Mes: S/ {balanceFinancieroMaster.pe_ganActual.toFixed(2)}</span>
                        <strong>Meta Gastos: S/ {balanceFinancieroMaster.pe_egMeta.toFixed(2)}</strong>
                    </div>
                    {balanceFinancieroMaster.pe_progreso < 100 ? <small style={{color:ROJO_BJ, fontWeight:'bold', display:'block', marginTop:'5px'}}>Faltan S/ {(balanceFinancieroMaster.pe_egMeta - balanceFinancieroMaster.pe_ganActual).toFixed(2)} para cubrir costos operativos.</small> : <small style={{color:VERDE_EXITO, fontWeight:'bold', display:'block', marginTop:'5px'}}>¡Meta superada! Tu negocio ya es rentable este mes.</small>}
                </div>

                {/* BÓVEDA PARA RETIRO */}
                <div style={{ ...bjCardStyle, backgroundColor: '#1E1B1C', color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA DISPONIBLE (UTILIDAD PARA TI)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0}}>S/ {balanceFinancieroMaster.disponibleBoveda.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Utilidad neta histórica acumulada menos tus retiros personales registrados.</small>
                </div>
            </div>

            {/* AUDITORÍA DE CAJA Y ALMACÉN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...bjCardStyle, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionInventario.costoTotalAlmacen.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...bjCardStyle, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL GLOBAL (DINERO EN MANO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceFinancieroMaster.cajaGlobalReal.toFixed(2)}</h4>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={bjCardStyle}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Registrar Movimiento de Fondos</h4>
                  <form onSubmit={handleRegistrarFinanzaManual} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInputStyle}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital (No PE)</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...bjInputStyle, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">De: Caja Global (Capital)</option>
                            <option value="Ganancias">De: Ganancias del Negocio</option>
                        </select>
                    </div>
                    <input placeholder="Descripción del gasto o ingreso..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInputStyle} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={bjInputStyle} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR MOVIMIENTO</button>
                  </form>
                </div>
                <div style={{ ...bjCardStyle, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Nuevo Producto BJ</h4>
                  <form onSubmit={handleAddProductoCatalogo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={bjInputStyle} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInputStyle} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={bjCardStyle}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🏆 RANKING DE RENTABILIDAD BJ</h4>
                  {analyticsBJMaster.ranking.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f1f1'}}>
                        <span>{i+1}. {p[0]}</span>
                        <strong style={{color:VERDE_BJ}}>+ S/ {p[1].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div style={{...bjCardStyle, borderLeft:`12px solid ${ROJO_BJ}`}}>
                    <h4 style={{margin:0, color:ROJO_ALERTA, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💤 DINERO ESTANCADO (+20 DÍAS)</h4>
                    {analyticsBJMaster.dormidos.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <span>{p.nombre}</span>
                            <strong style={{color:ROJO_ALERTA}}>{p.stock} Und.</strong>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* LIBRO DIARIO EXPANDIDO */}
            <div style={bjCardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado con Origen de Fondos</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            <td style={{ padding: '20px 10px' }}>
                                <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                <br/><span style={{ fontWeight: '600', fontSize:'15px' }}>{f.descripcion}</span>
                                <br/><small style={{color: AMARILLO_BJ, fontWeight:'900'}}>Bolsa: {f.origen || 'Caja Global'}</small>
                            </td>
                            <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '17px', color: (f.tipo.includes('Ingreso')) ? VERDE_BJ : '#1E1B1C' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '20px 10px' }}>
                                <button onClick={async ()=> { if(confirm("¿Borrar movimiento definitivamente?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* GRÁFICO ROI EXPANDIDO */}
            <div style={bjCardStyle}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seriesGraficoROI} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={80}>
                                {seriesGraficoROI.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}