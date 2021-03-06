import PropTypes from "prop-types";
import React from "react";
import CampaignList from "./CampaignsList";
import FloatingActionButton from "material-ui/FloatingActionButton";
import ContentAdd from "material-ui/svg-icons/content/add";
import ArchiveIcon from "material-ui/svg-icons/content/archive";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import loadData from "./hoc/load-data";
import { withRouter } from "react-router";
import gql from "graphql-tag";
import theme from "../styles/theme";
import LoadingIndicator from "../components/LoadingIndicator";
import wrapMutations from "./hoc/wrap-mutations";
import IconMenu from "material-ui/IconMenu";
import { MenuItem } from "material-ui/Menu";
import { dataTest } from "../lib/attributes";
import IconButton from "material-ui/IconButton/IconButton";
import SortBy, {
  DEFAULT_SORT_BY_VALUE
} from "../components/AdminCampaignList/SortBy";
import Paper from "material-ui/Paper";
import Search from "../components/Search";
import { StyleSheet, css } from "aphrodite";
import CampaignStatusSelect from "../components/CampaignStatusSelect";

const styles = StyleSheet.create({
  settings: {
    display: "flex",
    flexDirection: "column",
    padding: "20px"
  }
});

const defaultSort = DEFAULT_SORT_BY_VALUE;

class AdminCampaignList extends React.Component {
  state = {
    isLoading: false,
    campaignsFilter: {
      searchString: "",
      status: "ACTIVE"
    },
    archiveMultiple: false,
    campaignsToArchive: {},
    sortBy: defaultSort
  };

  handleClickNewButton = async () => {
    const { organizationId } = this.props.params;
    this.props.router.push(`/admin/${organizationId}/campaigns/new`);
  };

  handleClickArchiveButton = async keys => {
    if (keys.length) {
      this.setState({ isLoading: true });
      await this.props.mutations.archiveCampaigns(keys);
      this.setState({
        archiveMultiple: false,
        isLoading: false,
        campaignsToArchive: {}
      });
    }
  };

  handleFilterChange = (event, index, status) => {
    this.setState({
      campaignsFilter: {
        status
      },
      sortBy: defaultSort
    });
  };

  handleChecked = ({ campaignId, checked }) => {
    this.setState(prevState => {
      const { campaignsToArchive } = prevState;
      // checked has to be reversed here because the onTouchTap
      // event fires before the input is checked.
      if (!checked) {
        campaignsToArchive[campaignId] = !checked;
      } else {
        delete campaignsToArchive[campaignId];
      }
      return { campaignsToArchive };
    });
  };

  toggleStateWithDelay = (property, delay) => {
    setTimeout(() => {
      this.setState(prevState => ({ [property]: !prevState[property] }));
    }, delay);
  };

  handleSortByChanged = sortBy => {
    this.setState({ sortBy });
  };

  handleSearchRequested = searchString => {
    const campaignsFilter = {
      ...this.state.campaignsFilter,
      searchString
    };
    this.setState({ campaignsFilter });
  };

  handleCancelSearch = () => {
    const campaignsFilter = {
      ...this.state.campaignsFilter,
      searchString: ""
    };
    this.setState({ campaignsFilter });
  };

  renderArchivedAndSortBy = () => {
    return (
      !this.state.archiveMultiple && (
        <span>
          <span>
            <CampaignStatusSelect
              value={this.state.campaignsFilter.status}
              onChange={this.handleFilterChange}
            />
            <SortBy
              onChange={this.handleSortByChanged}
              sortBy={this.state.sortBy}
            />
          </span>
        </span>
      )
    );
  };

  renderSearch = () => {
    return (
      !this.state.archiveMultiple && (
        <Search
          onSearchRequested={this.handleSearchRequested}
          searchString={this.state.campaignsFilter.searchString}
          onCancelSearch={this.handleCancelSearch}
          hintText="Search for campaign title. Hit enter to search."
        />
      )
    );
  };

  renderFilters = () => (
    <Paper className={css(styles.settings)} zDepth={1}>
      <span>
        {this.props.params.adminPerms && this.renderArchiveMultiple()}
        {this.renderArchivedAndSortBy()}
      </span>
      <span>{this.renderSearch()}</span>
    </Paper>
  );

  renderArchiveMultiple() {
    return (
      <IconMenu
        iconButtonElement={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
        style={{ bottom: "13px" }}
      >
        {/*
          The IconMenu component delays hiding the menu after it is
          clicked for 200ms. This looks nice, so the state change is
          delayed for 201ms to avoid switching the menu text before the
          menu is hidden.
        */}
        {this.state.archiveMultiple ? (
          <MenuItem
            primaryText="Cancel"
            onClick={() => {
              this.toggleStateWithDelay("archiveMultiple", 250);
            }}
          />
        ) : (
          <MenuItem
            primaryText="Archive multiple campaigns"
            onClick={() => {
              this.toggleStateWithDelay("archiveMultiple", 250);
            }}
          />
        )}
      </IconMenu>
    );
  }

  renderActionButton() {
    if (this.state.archiveMultiple) {
      const keys = Object.keys(this.state.campaignsToArchive);
      return (
        <FloatingActionButton
          {...dataTest("archiveCampaigns")}
          style={theme.components.floatingButton}
          onClick={() => this.handleClickArchiveButton(keys)}
          disabled={!keys.length}
        >
          <ArchiveIcon />
        </FloatingActionButton>
      );
    }
    return (
      <FloatingActionButton
        {...dataTest("addCampaign")}
        style={theme.components.floatingButton}
        onClick={this.handleClickNewButton}
      >
        <ContentAdd />
      </FloatingActionButton>
    );
  }

  render() {
    const { adminPerms } = this.props.params;
    return (
      <div>
        {this.renderFilters()}
        {this.state.isLoading ? (
          <LoadingIndicator />
        ) : (
          <CampaignList
            campaignsFilter={this.state.campaignsFilter}
            sortBy={this.state.sortBy}
            organizationId={this.props.params.organizationId}
            adminPerms={adminPerms}
            selectMultiple={this.state.archiveMultiple}
            handleChecked={this.handleChecked}
          />
        )}

        {adminPerms && this.renderActionButton()}
      </div>
    );
  }
}

AdminCampaignList.propTypes = {
  params: PropTypes.object,
  mutations: PropTypes.exact({
    archiveCampaigns: PropTypes.func
  }),
  router: PropTypes.object
};

const mapMutationsToProps = () => ({
  archiveCampaigns: ids => ({
    mutation: gql`
      mutation archiveCampaigns($ids: [String!]) {
        archiveCampaigns(ids: $ids) {
          id
        }
      }
    `,
    variables: { ids }
  })
});

export default loadData(wrapMutations(withRouter(AdminCampaignList)), {
  mapMutationsToProps
});
