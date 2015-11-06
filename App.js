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
                    this._loadDataForComboBox();
                },
                scope: this
            }
        });
        this.add(cb);
        cb.setVisible(false);
    },

    _loadDataForComboBox: function(){
        var storeForRelease = Ext.create('Rally.data.wsapi.Store', {
            model: 'Release',
            filters: [{
                property: 'Name',
                operator: 'Contains',
                value: '(F)'
            }],
            listeners: {
                load: function (myStore, myData, success) {
                    console.log(myStore);
                    if(this.releaseStartComboBox) return;
                    this.arrayOfReleases = [];
                    this.myArray = [];
                    var mySet = new Set();
                    var day = new Date();
                    for(var i = myStore.getCount() - 1; i > -1; --i){
                        var el = myStore.getAt(i).data;
                        if(mySet.has(el.Name)) continue;
                        this.arrayOfReleases.push(myStore.getAt(i));
                        var string = [];
                        string.push(mySet.size);
                        string.push(el.Name);
                        mySet.add(el.Name);
                        this.myArray.push(string);
                        if(el.ReleaseStartDate <= day && day <= el.ReleaseDate)
                            this.needSelect = string[0];
                    }
                    this._loadEndDateForChart(this.myArray);
                },
                scope: this
            },
            fetch:["Name","ReleaseStartDate", "ReleaseDate", "ObjectID", "State", "PlannedVelocity"],
            limit: Infinity
        });
        this.first = true;
        storeForRelease.load();
    },

    _loadEndDateForChart: function(myStore){
        this.releaseEndComboBox  = Ext.create('Rally.ui.combobox.ComboBox',{
            fieldLabel: 'End Release:',
            labelAlign: 'right',
            store: myStore,
            listeners:{
                ready: function(combobox){
                    this._loadStartDateForChart(myStore);
                },
                select: function(combobox, records){
                    if(!this.first)this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.releaseEndComboBox);
        this._myFunction();
    },

    _myFunction: function(){
        this.releaseEndComboBox.select(this.needSelect);
        this.releaseStartComboBox.select(this.needSelect);
        this.first = false;
        this._loadData();
    },

    _loadStartDateForChart: function(myStore){
        this.releaseStartComboBox  = Ext.create('Rally.ui.combobox.ComboBox',{
            fieldLabel: 'Start Release:',
            labelAlign: 'right',
            store: myStore,
            listeners:{
                ready: function(comobox){
                },
                select: function(combobox, records){
                    if(!this.first)this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.releaseStartComboBox);
    },

    _loadData: function(){
        if (this.chart) {
            this.remove(this.chart);
        }
        this.endChartDate = this.arrayOfReleases[this.releaseEndComboBox.getRecord().data.field1].data.ReleaseDate;
        this.startChartDate = this.arrayOfReleases[this.releaseStartComboBox.getRecord().data.field1].data.ReleaseStartDate;
        this.startIndex = this.releaseStartComboBox.getRecord().data.field1;
        this.endIndex = this.releaseEndComboBox.getRecord().data.field1;
        console.log(this.endChartDate, this.startChartDate);
        console.log(this.arrayOfReleases);

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
        var releaseFilter;
        this.releaseById = new Map();
        var size = 0;
        for(var index = this.startIndex; index >= this.endIndex; --index){
             var buf = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Release',
                operator: '=',
                value: this.arrayOfReleases[index].data._ref
            });
            this.releaseById.set(this.arrayOfReleases[index].data._ref, size++);
            if(releaseFilter){
                releaseFilter = releaseFilter.or(buf);
            }else{
                releaseFilter = buf;
            }
        }
        /*var startFilter = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '>=',
            value: Ext.Date.format(this.startChartDate , 'Y-m-d')
        });
        var endFilter = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '<=',
            value: Ext.Date.format(this.endChartDate, 'Y-m-d')
        });*/
        var needFilter = this.myFilter.and(releaseFilter).and(someFilter);
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
        console.log(store);
        var bufferArray = [];
        var releaseNames = [];
        for(var index = this.startIndex; index >= this.endIndex; --index){
            bufferArray.push(0);
            releaseNames.push(this.arrayOfReleases[index].data.Name);
        }
        this.myMap = new Map();
        for(var i = 0; i < this.categoriesForChart.length; ++i) {
            this.myMap.set(this.categoriesForChart[i], bufferArray.slice());
        }
        console.log(store.getAt(0));
        for(var i = 0; i < store.getCount(); ++i){
            var el = store.getAt(i).data;
            //console.log(el.Release);
            var index = this.releaseById.get(el.Release);
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