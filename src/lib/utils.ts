export function numberToVietnameseWords(num: number): string {
    if (num === 0) return 'Không đồng';
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    function convertThreeDigits(n: number): string {
        if (n === 0) return ''; 
        let result = ''; 
        const hundred = Math.floor(n / 100); 
        const remainder = n % 100;
        if (hundred > 0) { 
            result += ones[hundred] + ' trăm'; 
            if (remainder > 0) result += ' '; 
        }
        if (remainder >= 10 && remainder < 20) { 
            result += teens[remainder - 10]; 
        } 
        else {
            const ten = Math.floor(remainder / 10); 
            const one = remainder % 10;
            if (ten > 0) { 
                if (ten === 1) result += 'mười'; 
                else result += tens[ten]; 
                if (one > 0) result += ' '; 
            } 
            else if (hundred > 0 && one > 0) { 
                result += 'lẻ '; 
            }
            if (one === 5 && ten > 0) result += 'lăm'; 
            else if (one === 1 && ten > 1) result += 'mốt'; 
            else if (one > 0) result += ones[one];
        } 
        return result;
    }
    let isNegative = false; 
    if (num < 0) { isNegative = true; num = Math.abs(num); }
    num = Math.round(num); 
    let result = ''; 
    let scaleIndex = 0; 
    const scales = ['', 'nghìn', 'triệu', 'tỷ'];
    while (num > 0) {
        const threeDigits = num % 1000;
        if (threeDigits > 0) result = convertThreeDigits(threeDigits) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (result ? ' ' + result : '');
        num = Math.floor(num / 1000); scaleIndex++;
    }
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (isNegative) result = 'Âm ' + result.toLowerCase();
    return result + ' đồng';
}

export function extractZalo(txt: string) {
    if(!txt) return null; 
    let lines = txt.split('\n').map(l => l.trim()); 
    let prods: any[] = [];        
    let currentState: string | null = null;
    let productLines: string[] = [];
    
    const anchors = [
        { key: 'cName', regex: /^Tên Khách Hàng\s*:/i },
        { key: 'phone', regex: /^Số Điện Thoại\s*:/i },
        { key: 'address', regex: /^Địa Chỉ Giao Hàng\s*:/i },
        { key: 'source', regex: /^Nguồn\s*:/i },
        { key: 'project', regex: /^Công trình/i },
        { key: 'toiletCount', regex: /^Số lượng nhà vệ sinh/i },
        { key: 'houseStatus', regex: /^Tình trạng nhà khách hàng\s*:/i },
        { key: 'renovNote', regex: /^Ghi chú nhà cải tạo/i },
        { key: 'stage', regex: /^Giai đoạn hoàn thiện/i },
        { key: 'products', regex: /^Sản phẩm KH/i },
        { key: 'rating', regex: /^Đánh giá tình trạng KH\s*:/i },
        { key: 'deposit', regex: /^Số Tiền Cọc\s*:/i },
        { key: 'depositMethod', regex: /^Hình thức cọc\s*:/i },
        { key: 'vat', regex: /^Xuất VAT/i },
        { key: 'dNote', regex: /^Ghi chú\s*:/i },
        { key: 'reason', regex: /^Lý do chưa chốt\s*:/i },
        { key: 'feeling', regex: /^Cảm nhận riêng\s*:/i },
        { key: 'suggest', regex: /^Sản phẩm đề xuất\s*:/i },
        { key: 'currentStatus', regex: /^Tình trạng hiện tại/i },
        { key: 'specs', regex: /^Thông số đặc biệt/i },
        { key: 'question', regex: /^Câu hỏi quan tâm/i }
    ];

    let extractedData: any = {};

    for (let line of lines) {
        if (!line) continue;
        let matched = false;
        for (let anchor of anchors) {
            if (anchor.regex.test(line)) {
                currentState = anchor.key;
                let val = line.replace(anchor.regex, '').replace(/^[:\s-]+/, '').trim();
                if (val) {
                    if (currentState === 'products') productLines.push(val);
                    else extractedData[currentState] = val;
                }
                matched = true;
                break;
            }
        }
        if (!matched && currentState) {
            let cleanLine = line.replace(/^- /, '').trim();
            if (currentState === 'products') productLines.push(cleanLine);
            else {
                if(extractedData[currentState]) {
                    extractedData[currentState] += '\n' + line;
                } else {
                    extractedData[currentState] = line;
                }
            }
        }
    }

    productLines.forEach(pl => {
        if (!pl.trim()) return;
        let match = pl.match(/^(.*?)(?:\s*(?:-|x)\s*(\d+))?$/);
        if (match) {
            let n = match[1].trim();
            let q = match[2] ? parseInt(match[2], 10) : 1;
            prods.push({ n, q });
        }
    });

    return {
        ...extractedData,
        prods
    };
}

export function extractRawProducts(txt: string) {
    let prods: any[] = [];
    if(!txt) return prods;
    let lines = txt.split('\n');
    lines.forEach(line => {
        let clean = line.replace(/^[-\*\+]\s*/, '').trim();
        if(!clean) return;
        let match = clean.match(/^(.*?)(?:\s+(?:x|-|sl:?)\s*(\d+))?$/i);
        if(match) {
            let n = match[1].trim();
            let q = match[2] ? parseInt(match[2]) : 1;
            prods.push({ n, q });
        }
    });
    return prods;
}

export function autocompleteMatch(input: string, dataArray: string[]) {
    const v = input.toLowerCase().trim();
    if (!v) return [];
    return dataArray.filter(k => k.toLowerCase().includes(v)).slice(0, 10);
}
