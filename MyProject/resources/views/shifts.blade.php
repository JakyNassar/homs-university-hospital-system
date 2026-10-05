<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
body {
    direction: rtl;
    text-align: right;
    font-family: 'dejavu sans';
    font-size: 13px;
}
h1 {
    text-align: center;
    margin-bottom: 10px;
    font-size: 18px;
}
.month-title {
    text-align: center;
    color: #555;
    margin-bottom: 25px;
    font-size: 14px;
}
h2 {
    background: #1a4d8c;
    color: white;
    padding: 8px 12px;
    margin-top: 20px;
    margin-bottom: 5px;
    font-size: 14px;
    border-radius: 4px;
}
h3 {
    background: #eee;
    padding: 6px 10px;
    margin: 8px 0 4px 0;
    font-size: 13px;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
}
th, td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: center;
}
th {
    background: #f2f2f2;
    font-size: 12px;
}
td {
    font-size: 12px;
}
</style>
</head>
<body>

<h1>جدول مناوبات المقيمين — {{ $departmentName }}</h1>

@foreach($groupedShifts as $date => $dateShifts)
<h2> التاريخ: {{ $date }}</h2>

<table>
    <thead>
        <tr>
            <th>الطبيب</th>
            <th>السنة</th>
            <th>المكان</th>
            <th>من</th>
            <th>إلى</th>
        </tr>
    </thead>
    <tbody>
        @foreach($dateShifts as $shift)
        <tr>
            <td>{{ $shift->user->full_name ?? '—' }}</td>
            <td>{{ $shift->user->study_year ?? '—' }}</td>
            <td>{{ $shift->location->name ?? '—' }}</td>
            <td>{{ $shift->start_time }}</td>
            <td>{{ $shift->end_time }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endforeach

</body>
</html>