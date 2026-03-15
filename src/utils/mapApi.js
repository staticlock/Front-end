/**
 * 地图API工具函数
 * 使用免费的 OpenStreetMap 相关服务
 */

// Nominatim 搜索API (OpenStreetMap 提供的免费地理编码服务)
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// OSRM 各出行方式对应的公开服务端点（各自独立支持对应出行方式）
const OSRM_PROFILES = {
  driving: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  cycling: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike'
}

/**
 * 搜索地点
 * @param {string} query 搜索关键词
 * @param {number} limit 返回结果数量限制
 * @returns {Promise<Array>} 搜索结果
 */
export async function searchPlaces(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: limit.toString(),
      "accept-language": "zh-CN,zh,en",
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        "User-Agent": "VueMapApp/1.0",
      },
    });

    if (!response.ok) throw new Error("搜索请求失败");

    const data = await response.json();
    return data.map((item) => ({
      id: item.place_id,
      name: item.display_name,
      shortName: item.name || item.display_name.split(",")[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      address: item.address,
    }));
  } catch (error) {
    console.error("搜索地点失败:", error);
    return [];
  }
}

/**
 * 反向地理编码 - 根据坐标获取地址
 * @param {number} lat 纬度
 * @param {number} lng 经度
 * @returns {Promise<Object|null>} 地址信息
 */
export async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
      addressdetails: "1",
      "accept-language": "zh-CN,zh,en",
    });

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        "User-Agent": "VueMapApp/1.0",
      },
    });

    if (!response.ok) throw new Error("反向地理编码失败");

    const data = await response.json();
    return {
      name: data.display_name,
      shortName: data.name || data.display_name.split(",")[0],
      address: data.address,
    };
  } catch (error) {
    console.error("反向地理编码失败:", error);
    return null;
  }
}

/**
 * 获取路线
 * @param {Array} start [lng, lat] 起点坐标
 * @param {Array} end [lng, lat] 终点坐标
 * @param {string} profile 出行方式: driving, walking, cycling
 * @returns {Promise<Object|null>} 路线信息
 */
export async function getRoute(start, end, profile = "driving") {
  try {
    const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const baseUrl = OSRM_PROFILES[profile] || OSRM_PROFILES.driving;
    const url = `${baseUrl}/${coordinates}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("路线请求失败");

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("未找到路线");
    }

    const route = data.routes[0];
    return {
      distance: route.distance, // 米
      duration: route.duration, // 秒
      geometry: route.geometry, // GeoJSON 格式的路线
      steps: route.legs[0]?.steps || [],
    };
  } catch (error) {
    console.error("获取路线失败:", error);
    return null;
  }
}

/**
 * 计算两点间的直线距离 (Haversine公式)
 * @param {number} lat1 起点纬度
 * @param {number} lng1 起点经度
 * @param {number} lat2 终点纬度
 * @param {number} lng2 终点经度
 * @returns {number} 距离(米)
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径(米)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 格式化距离显示
 * @param {number} meters 距离(米)
 * @returns {string} 格式化后的距离
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} 米`;
  }
  return `${(meters / 1000).toFixed(2)} 公里`;
}

/**
 * 格式化时间显示
 * @param {number} seconds 时间(秒)
 * @returns {string} 格式化后的时间
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} 秒`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} 分钟`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分钟`;
}

/**
 * 防抖函数
 * @param {Function} fn 要防抖的函数
 * @param {number} delay 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
