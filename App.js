Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {

        this._createChart();
    },

    _createChart: function(){

        var store = Ext.create('Ext.data.Store', {
            model: 'WeatherPoint',
            data: [
                { temperature: 58, date: new Date(2011, 1, 1, 8) },
                { temperature: 63, date: new Date(2011, 1, 1, 9) },
                { temperature: 73, date: new Date(2011, 1, 1, 10) },
                { temperature: 78, date: new Date(2011, 1, 1, 11) },
                { temperature: 81, date: new Date(2011, 1, 1, 12) }
            ]

        });
        this.chart = Ext.create('Ext.chart.Chart', {
            width: 400,
            height: 300,
            store: store
        });
        this.add(this.chart);
        //this.chart._unmask();

    },
    _getChartData: function (array, opened, closed, active) {
        return {
            categories: array,
            series: [
                {
                    name: 'Create Defects',
                    data: opened

                },
                {
                    name: 'Close Defects',
                    data: closed

                },
                {
                    name: 'Active Defects',
                    type: 'line',
                    data: active

                }

            ]
        };
    },

    _getChartConfig: function () {
        return {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Defect Arrival and Kill Rate'
            },
            xAxis: {
                title: {
                    text: 'Date'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Count'
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y}</b></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.01,
                    borderWidth: 0,
                    width: 0.2
                },
                series: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    },
                    groupPadding: 0.05
                }
            }
        };
    }
});