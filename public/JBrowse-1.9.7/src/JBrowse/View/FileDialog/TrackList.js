define("JBrowse/View/FileDialog/TrackList", ['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/dom-construct',
        'JBrowse/Util',
        'dijit/form/TextBox',
        'dijit/form/Select',
        'dijit/form/Button',
        './TrackList/BAMDriver',
        './TrackList/BigWigDriver',
        './TrackList/GFF3Driver',
        './TrackList/VCFTabixDriver',
        'JBrowse/View/TrackConfigEditor'
       ],
       function(
           declare,
           array,
           dom,
           Util,
           TextBox,
           Select,
           Button,
           BAMDriver,
           BigWigDriver,
           GFF3Driver,
           VCFTabixDriver,
           TrackConfigEditor
       ) {

var uniqCounter = 0;

return declare( null, {

constructor: function( args ) {
    this.browser = args.browser;
    this.fileDialog = args.dialog;
    this.domNode = dom.create('div', { className: 'trackList', innerHTML: 'track list!' });
    this.types = [ new BAMDriver(), new BigWigDriver(), new GFF3Driver(), new VCFTabixDriver() ];

    this._updateDisplay();
},


getTrackConfigurations: function() {
    return Util.dojof.values( this.trackConfs || {} );
},

update: function( resources ) {
    this.storeConfs = {};
    this.trackConfs = {};

    this._makeStoreConfs( resources );

    // make some track configurations from the store configurations
    this._makeTrackConfs();

    this._updateDisplay();
},

_makeStoreConfs: function( resources ) {
    // when called, rebuild the store and track configurations that we are going to add
    this.storeConfs = this.storeConfs || {};

    // anneal the given resources into a set of data store
    // configurations by offering each file to each type driver in
    // turn until no more are being accepted
    var lastLength = 0;
    while( resources.length && resources.length != lastLength ) {
        resources = array.filter( resources, function( resource ) {
            return ! array.some( this.types, function( typeDriver ) {
               return typeDriver.tryResource( this.storeConfs, resource );
            },this);
        },this);

        lastLength = resources.length;
    }

    array.forEach( this.types, function( typeDriver ) {
        typeDriver.finalizeConfiguration( this.storeConfs );
    },this);

    if( resources.length )
        console.warn( "Not all resources could be assigned to tracks.  Unused resources:", resources );
},

_makeTrackConfs: function() {
    // object that maps store type -> default track type to use for the store
    var typeMap = this.browser.getTrackTypes().trackTypeDefaults;

    for( var n in this.storeConfs ) {
        var store = this.storeConfs[n];
        var trackType = typeMap[store.type] || 'JBrowse/View/Track/HTMLFeatures';

        this.trackConfs = this.trackConfs || {};

        this.trackConfs[ n ] =  {
                store: this.storeConfs[n],
                label: n,
                key: n.replace(/_\d+$/,'').replace(/_/g,' '),
                type: trackType
        };
    }
},

_delete: function( trackname ) {
    delete (this.trackConfs||{})[trackname];
    this._updateDisplay();
},

_updateDisplay: function() {
    var that = this;

    // clear it
    dom.empty( this.domNode );

    dom.create('h3', { innerHTML: 'New Tracks' }, this.domNode );

    if( ! Util.dojof.keys( this.trackConfs||{} ).length ) {
        dom.create('div', { className: 'emptyMessage',
                            innerHTML: 'None'
                          },this.domNode);
    } else {
        var table = dom.create('table', { innerHTML: '<tr class="head"><th>Name</th><th>Display</th><th></th></tr>'}, this.domNode );

        var trackTypes = this.browser.getTrackTypes();

        for( var n in this.trackConfs ) {
            var t = this.trackConfs[n];
            var r = dom.create('tr', {}, table );
            new TextBox({
                value: t.key,
                onChange: function() { t.key = this.get('value'); }
            }).placeAt( dom.create('td',{ className: 'name' }, r ) );
            new Select({
                    options: array.map( trackTypes.knownTrackTypes, function( t ) {
                                            var l = trackTypes.trackTypeLabels[t]
                                                || t.replace('JBrowse/View/Track/','').replace(/\//g, ' ');
                                            return { label: l, value: t };
                                        }),
                    value: t.type,
                    onChange: function() {
                        t.type = this.get('value');
                    }
            }).placeAt( dom.create('td',{ className: 'type' }, r ) );

            new Button({
               className: 'edit',
               title: 'edit configuration',
               innerHTML: 'Edit Configuration',
               onClick: function() {
                   new TrackConfigEditor( t )
                     .show( function( result) {
                                dojo.mixin( t, result.conf );
                                that._updateDisplay();
                     });
               }
            }).placeAt( dom.create('td', { className: 'edit' }, r ) );

            dojo.create('td',{
                  width: '1%',
                  innerHTML: '<div class="dijitIconDelete"></div>',
                  onclick: function(e) {
                      e.preventDefault && e.preventDefault();
                      that._delete( n );
                  }
                }, r);

            dom.create('td',{ className: 'type' }, r );
        }
    }
}

});
});

