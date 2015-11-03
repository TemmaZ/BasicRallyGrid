Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {

        this.myLayout = Ext.create('Ext.container.Container',{
            layout: {
                type: 'hbox',
                align: 'stretch'
            }
        });
        this.add(this.myLayout);
        var filters = [];
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Environment',
            operator: '!=',
            value: 'Production'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Environment',
            operator: '!=',
            value: 'DR Site'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'c_IssueType',
            operator: '=',
            value: 'Bug'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Duplicate'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Future Enhancement'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Cannot Replicate'
        }));

        this.myFilter = filters[0];
        for(var i = 1; i < filters.length; ++i) this.myFilter = this.myFilter.and(filters[i]);

        var cb = Ext.create('Rally.ui.combobox.FieldValueComboBox',{
            model: 'Defect',
            field: 'Severity',
            listeners: {
                ready: function (combobox) {
                    var arrayData = cb.getStore();
                    arrayData = arrayData.data.items;
                    this.categoriesForChart = [];
                    for(var i = 0; i < arrayData.length; ++i) {
                        var value = arrayData[i].data.value;
                        this.categoriesForChart.push(value);
                    }
                    this._loadStartDateForChart();
                },
                scope: this
            }
        });
        this.add(cb);
        cb.setVisible(false);

    },

    _loadStartDateForChart: function(){
        this.releaseStartComboBox  = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
            fieldLabel: 'Start Release:',
            labelAlign: 'right',
            listeners:{
                ready: function(combobox){
                    this.arrayOfReleases = this.releaseStartComboBox.getStore().data.items;
                    this.indexOfRelease = new Map();
                    for(var i = 0; i < this.arrayOfReleases.length; ++i){
                        this.indexOfRelease.set(this.arrayOfReleases[i].data.Name, i);
                    }
                    this._loadEndDateForChart();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.releaseStartComboBox);
    },

    _loadEndDateForChart: function(){
        this.releaseEndComboBox  = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
            fieldLabel: 'End Release:',
            labelAlign: 'right',
            listeners:{
                ready: function(comobox){
                    this._loadData();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.releaseEndComboBox);
    },

    _loadData: function(){
        if (this.chart) {
            this.remove(this.chart);
        }
        this.endChartDate = this.releaseEndComboBox.getRecord().data.ReleaseDate;
        this.startChartDate = this.releaseStartComboBox.getRecord().data.ReleaseStartDate;

        var status = Ext.create('Rally.data.wsapi.Filter',{
            property: 'State',
            operator: '!=',
            value: 'Close'
        });
        var closeFilter = Ext.create('Rally.data.wsapi.Filter',{
            property: 'ClosedDate',
            operator: '>',
            value: Ext.Date.format(this.endChartDate, 'Y-m-d')
        });
        var someFilter = status.or(closeFilter);

        var startFilter = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '>=',
            value: Ext.Date.format(this.startChartDate , 'Y-m-d')
        });
        var endFilter = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '<=',
            value: Ext.Date.format(this.endChartDate, 'Y-m-d')
        });
        var needFilter = this.myFilter.and(startFilter).and(endFilter).and(someFilter);
            //console.log(needFilter.toString());
        if(this.myStore){
            this.myStore.setFilter(needFilter);
            this.myStore.load();
        }else {
            this.myStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'Defect',
                autoLoad: true,
                filters: needFilter,
                listeners: {
                    load: function (myStore, myData, success) {
                        this._createChart(myStore)
                    },
                    scope: this
                },
                limit: Infinity
            });
        }

    },
    _createChart: function(store){
        var startIndex = this.indexOfRelease.get(this.releaseStartComboBox.getRecord().data.Name);
        var endIndex = this.indexOfRelease.get(this.releaseEndComboBox.getRecord().data.Name);
        console.log(store);
        var bufferArray = [];
        var releaseNames = [];
        this.datesOfReleases = [];
        for(var index = startIndex; index >= endIndex; --index){
            bufferArray.push(0);
            releaseNames.push(this.arrayOfReleases[index].data.Name);
            var buff = [this.arrayOfReleases[index].data.ReleaseStartDate, this.arrayOfReleases[index].data.ReleaseDate];
            this.datesOfReleases.push(buff);
        }
        this.myMap = new Map();
        for(var i = 0; i < this.categoriesForChart.length; ++i) {
            this.myMap.set(this.categoriesForChart[i], bufferArray.slice());
        }
        for(var i = 0; i < store.getCount(); ++i){
            var el = store.getAt(i).data;
            //console.log(el.Release);
            var date = el.CreationDate;
            var index = -1;
            for(var a = 0; a < this.datesOfReleases.length; ++a){
                if(date >= this.datesOfReleases[a][0] && date <= this.datesOfReleases[a][1]){
                    index = a;
                    break;
                }
            }
            if(index == -1) continue;
            //console.log(index);
            (this.myMap.get(el.Severity))[index]++;
        }

        var chartData = {
            categories: releaseNames,
            series: []
        };

        var buff = this.myMap.keys();
        var a = buff.next();
        var colors = [];
        var step = 0;
        var numOfStep = this.myMap.size;
        while(!a.done){
            var buffer = {
                name: a.value,
                data: this.myMap.get(a.value)
            };
            chartData.series.push(buffer);
            colors.push(this._createColor(numOfStep, step++));
            a = buff.next();
        }
        //console.log(chartData, colors);
        this.chart = Ext.create('Rally.ui.chart.Chart', {
            xtype: 'rallychart',
            chartData: chartData,
            chartConfig: this._getChartConfig(),
            chartColors: colors
        });

        this.add(this.chart);
        this.chart._unmask();

    },

    _getChartConfig: function () {
        return {
            chart: {
              type: 'column'
            },
            title: {
                text: 'Open Defects by Severity Overtime by Sprint/Release (non-production)'
            },
            xAxis: {
                labels: {
                    rotation: -45,
                    align: 'right',
                    style: {
                        fontSize: '11px',
                        fontFamily: 'Verdana, sans-serif'
                    }
                },
                tickmarkPlacement: 'on',
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
                series: {
                    stacking: 'normal'
                }
            }
        };
    },

    _createColor: function rainbow(numOfSteps, step) {
        // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
        // Adam Cole, 2011-Sept-14
        // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
        var r, g, b;
        var h = step / numOfSteps;
        var i = ~~(h * 6);
        var f = h * 6 - i;
        var q = 1 - f;
        switch(i % 6){
            case 0: r = 1; g = f; b = 0; break;
            case 1: r = q; g = 1; b = 0; break;
            case 2: r = 0; g = 1; b = f; break;
            case 3: r = 0; g = q; b = 1; break;
            case 4: r = f; g = 0; b = 1; break;
            case 5: r = 1; g = 0; b = q; break;
        }
        var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
        return (c);
    }

});