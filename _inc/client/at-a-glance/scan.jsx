/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { numberFormat, translate as __ } from 'i18n-calypso';
import { getPlanClass } from 'lib/plans/constants';
import get from 'lodash/get';
import includes from 'lodash/includes';

/**
 * Internal dependencies
 */
import QueryVaultPressData from 'components/data/query-vaultpress-data';
import { getSitePlan } from 'state/site';
import { isPluginInstalled } from 'state/site/plugins';
import {
	getVaultPressScanThreatCount,
	getVaultPressData
} from 'state/at-a-glance';
import { isDevMode } from 'state/connection';
import { isFetchingSiteData } from 'state/site';
import DashItem from 'components/dash-item';
import isArray from 'lodash/isArray';

/**
 * Displays a card for Security Scan based on the props given.
 *
 * @param   {object} props Settings to render the card.
 * @returns {object}       Security Scan card
 */
const renderCard = ( props ) => (
	<DashItem
		label={ __( 'Security Scanning' ) }
		module={ props.feature || 'scan' }
		className={ props.className || '' }
		status={ props.status || '' }
		pro={ true }
	>
		{
			isArray( props.content )
				? props.content
				: <p className="jp-dash-item__description">{ props.content }</p>
		}
	</DashItem>
);

export class DashScan extends Component {
	static propTypes = {
		siteRawUrl: PropTypes.string.isRequired,
		rewindStatus: PropTypes.object,

		// Connected props
		vaultPressData: PropTypes.any.isRequired,
		scanThreats: PropTypes.any.isRequired,
		sitePlan: PropTypes.object.isRequired,
		isDevMode: PropTypes.bool.isRequired,
		isPluginInstalled: PropTypes.bool.isRequired,
		fetchingSiteData: PropTypes.bool.isRequired
	};

	static defaultProps = {
		siteRawUrl: '',
		rewindStatus: { state: 'unavailable' },
		vaultPressData: '',
		scanThreats: 0,
		sitePlan: '',
		isDevMode: false,
		isPluginInstalled: false,
		fetchingSiteData: false
	};

	getVPContent() {
		const {
			sitePlan,
			siteRawUrl,
			fetchingSiteData,
		} = this.props;
		const hasSitePlan = false !== sitePlan;
		const vpData = this.props.vaultPressData;
		const scanEnabled = get( vpData, [ 'data', 'features', 'security' ], false );

		if ( this.props.getOptionValue( 'vaultpress' ) ) {
			if ( 'N/A' === vpData ) {
				return renderCard( {
					status: '',
					content: __( 'Loading…' )
				} );
			}

			if ( scanEnabled ) {
				// Check for threats
				const threats = this.props.scanThreats;
				if ( threats !== 0 ) {
					return renderCard( {
						content: [
							<h3>{
								__( 'Uh oh, %(number)s threat found.', 'Uh oh, %(number)s threats found.', {
									count: threats,
									args: { number: numberFormat( threats ) }
								} )
							}</h3>,
							<p className="jp-dash-item__description">
								{__( '{{a}}View details at VaultPress.com{{/a}}', { components: { a: <a href="https://dashboard.vaultpress.com/" /> } } )}
								<br />
								{__( '{{a}}Contact Support{{/a}}', { components: { a: <a href="https://jetpack.com/support" /> } } )}
							</p>
						]
					} );
				}

				// All good
				if ( vpData.code === 'success' ) {
					return renderCard( {
						status: 'is-working',
						content: __( "No threats found, you're good to go!" )
					} );
				}
			}
		}

		if ( fetchingSiteData ) {
			return renderCard( {
				status: '',
				content: __( 'Loading…' )
			} );
		}

		const inactiveOrUninstalled = this.props.isVaultPressInstalled ? 'pro-inactive' : 'pro-uninstalled';
		const planClass = getPlanClass( get( sitePlan, 'product_slug', '' ) );
		const hasPremium = 'is-premium-plan' === planClass;
		const hasBusiness = 'is-business-plan' === planClass;

		return renderCard( {
			className: 'jp-dash-item__is-inactive',
			status: hasSitePlan ? inactiveOrUninstalled : 'no-pro-uninstalled-or-inactive',
			content: ( hasPremium || hasBusiness || scanEnabled )
				? __( 'For automated, comprehensive scanning of security threats, please {{a}}install and activate{{/a}} VaultPress.', {
					components: {
						a: <a href="https://wordpress.com/plugins/vaultpress" target="_blank" rel="noopener noreferrer" />
					}
				} )
				: __( 'For automated, comprehensive scanning of security threats, please {{a}}upgrade your account{{/a}}.', {
					components: {
						a: <a href={ 'https://jetpack.com/redirect/?source=aag-scan&site=' + siteRawUrl } target="_blank" rel="noopener noreferrer" />
					}
				} )
		} );
	}

	render() {
		if ( this.props.isDevMode ) {
			return renderCard( {
				className: 'jp-dash-item__is-inactive',
				content: __( 'Unavailable in Dev Mode.' )
			} );
		}

		const rewindStatus = get( this.props.rewindStatus, 'state', '' );
		const rewindNeedsCredentials = 'awaiting_credentials' === rewindStatus ||
			( 'unavailable' === get( this.props.rewindStatus, 'state', '' ) &&
				'vp_can_transfer' === get( this.props.rewindStatus, 'reason', '' ) );

		return (
			includes( [ 'active', 'provisioning', 'awaiting_credentials' ], rewindStatus )
				? renderCard( {
					feature: 'rewind',
					status: rewindNeedsCredentials ? 'is-awaiting-credentials' : 'is-working',
					className: rewindNeedsCredentials
						? 'jp-dash-item__is-awaiting-credentials'
						: 'jp-dash-item__is-active',
					content: rewindNeedsCredentials
						? __( 'Security scanning requires access to your site to work properly. ' +
							'{{a}}Add site credentials{{/a}}.', { components: {
								a: <a href={ encodeURI( `https://wordpress.com/stats/activity/${ this.props.siteRawUrl }?rewind-redirect=/wp-admin/admin.php?page=jetpack` ) } />
							} } )
						: __( 'We are making sure your site stays free of security threats. You will be notified if we find one.' ),
				} )
				: <div><QueryVaultPressData />{ this.getVPContent() }</div>
		);
	}
}

export default connect(
	state => ( {
		vaultPressData: getVaultPressData( state ),
		scanThreats: getVaultPressScanThreatCount( state ),
		sitePlan: getSitePlan( state ),
		isDevMode: isDevMode( state ),
		isVaultPressInstalled: isPluginInstalled( state, 'vaultpress/vaultpress.php' ),
		fetchingSiteData: isFetchingSiteData( state )
	} )
)( DashScan );
